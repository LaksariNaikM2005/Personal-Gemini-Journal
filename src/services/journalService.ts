import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { JournalEntry, JournalMessage, MoodType } from "../types";

/**
 * Input validation helpers to prevent malformed, oversized, or empty data
 */
export function validateJournalInput(input: {
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
}): { title: string; content: string; mood: MoodType | string; tags: string[] } {
  const trimmedTitle = (input.title || "").trim();
  if (!trimmedTitle) {
    throw new Error("Journal title cannot be empty.");
  }
  if (trimmedTitle.length > 300) {
    throw new Error("Journal title must be 300 characters or fewer.");
  }

  const trimmedContent = (input.content || "").trim();
  if (!trimmedContent) {
    throw new Error("Journal content cannot be empty.");
  }
  if (trimmedContent.length > 50000) {
    throw new Error("Journal content exceeds maximum length (50,000 characters).");
  }

  const mood = (input.mood || "Reflective").trim().slice(0, 50);

  const cleanTags = (input.tags || [])
    .map((t) => t.trim().slice(0, 50))
    .filter((t) => t.length > 0)
    .slice(0, 20);

  return {
    title: trimmedTitle,
    content: trimmedContent,
    mood,
    tags: cleanTags,
  };
}

export function validateId(id: string, fieldName = "ID"): string {
  if (!id || typeof id !== "string" || !id.trim()) {
    throw new Error(`Invalid ${fieldName}: identifier cannot be empty.`);
  }
  const cleanId = id.trim();
  if (cleanId.length > 128 || !/^[a-zA-Z0-9_\-]+$/.test(cleanId)) {
    throw new Error(`Invalid ${fieldName}: malformed identifier structure.`);
  }
  return cleanId;
}

/**
 * Asserts the user is currently authenticated and returns the trusted UID.
 * Never trust a client-passed or query-string userId.
 */
function getAuthenticatedUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Authentication required: Please sign in to perform this action.");
  }
  return uid;
}

/**
 * 1. CREATE JOURNAL
 * Creates a new journal document under users/{uid}/journals/{journalId}
 */
export async function createJournal(input: {
  title: string;
  content: string;
  mood: string;
  tags?: string[];
  aiSummary?: string;
}): Promise<JournalEntry> {
  const uid = getAuthenticatedUid();
  const valid = validateJournalInput(input);

  const journalId = `jnl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const journalRef = doc(db, "users", uid, "journals", journalId);
  const path = `users/${uid}/journals/${journalId}`;
  const now = new Date().toISOString();

  const newEntry: JournalEntry = {
    id: journalId,
    journalId,
    userId: uid,
    title: valid.title,
    content: valid.content,
    mood: valid.mood,
    tags: valid.tags,
    aiSummary: input.aiSummary ? input.aiSummary.slice(0, 5000) : "",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(journalRef, newEntry);
    return newEntry;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/**
 * 2. READ ALL USER JOURNALS
 * Fetches journals for the currently authenticated user
 */
export async function getUserJournals(): Promise<JournalEntry[]> {
  const uid = getAuthenticatedUid();
  const journalsColl = collection(db, "users", uid, "journals");
  const path = `users/${uid}/journals`;

  try {
    const q = query(journalsColl, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const journals: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as JournalEntry;
      journals.push({
        ...data,
        id: docSnap.id,
        journalId: data.journalId || docSnap.id,
      });
    });
    return journals;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

/**
 * 3. REALTIME SUBSCRIPTION TO USER JOURNALS
 */
export function subscribeUserJournals(
  onData: (journals: JournalEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const uid = getAuthenticatedUid();
  const journalsColl = collection(db, "users", uid, "journals");
  const path = `users/${uid}/journals`;

  return onSnapshot(
    journalsColl,
    (snapshot) => {
      const journals: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as JournalEntry;
        journals.push({
          ...data,
          id: docSnap.id,
          journalId: data.journalId || docSnap.id,
        });
      });
      journals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(journals);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

/**
 * 4. READ INDIVIDUAL JOURNAL
 * Reads a single journal entry ensuring it belongs to the authenticated user
 */
export async function getJournal(journalId: string): Promise<JournalEntry | null> {
  const uid = getAuthenticatedUid();
  const validId = validateId(journalId, "journal ID");
  const journalRef = doc(db, "users", uid, "journals", validId);
  const path = `users/${uid}/journals/${validId}`;

  try {
    const snap = await getDoc(journalRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data() as JournalEntry;
    return {
      ...data,
      id: snap.id,
      journalId: data.journalId || snap.id,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

/**
 * 5. UPDATE JOURNAL
 * Updates an existing journal entry for the authenticated user
 */
export async function updateJournal(
  journalId: string,
  updates: Partial<{
    title: string;
    content: string;
    mood: string;
    tags: string[];
    aiSummary: string;
  }>
): Promise<void> {
  const uid = getAuthenticatedUid();
  const validId = validateId(journalId, "journal ID");
  const journalRef = doc(db, "users", uid, "journals", validId);
  const path = `users/${uid}/journals/${validId}`;

  const payload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
    userId: uid, // Reinforce identity
  };

  if (updates.title !== undefined) {
    const trimmed = updates.title.trim();
    if (!trimmed) throw new Error("Journal title cannot be empty.");
    if (trimmed.length > 300) throw new Error("Journal title exceeds 300 characters.");
    payload.title = trimmed;
  }

  if (updates.content !== undefined) {
    const trimmed = updates.content.trim();
    if (!trimmed) throw new Error("Journal content cannot be empty.");
    if (trimmed.length > 50000) throw new Error("Journal content exceeds 50,000 characters.");
    payload.content = trimmed;
  }

  if (updates.mood !== undefined) {
    payload.mood = updates.mood.trim().slice(0, 50);
  }

  if (updates.tags !== undefined) {
    payload.tags = updates.tags
      .map((t) => t.trim().slice(0, 50))
      .filter((t) => t.length > 0)
      .slice(0, 20);
  }

  if (updates.aiSummary !== undefined) {
    payload.aiSummary = updates.aiSummary.slice(0, 5000);
  }

  try {
    await updateDoc(journalRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * 6. DELETE JOURNAL
 * Deletes a journal entry for the authenticated user
 */
export async function deleteJournal(journalId: string): Promise<void> {
  const uid = getAuthenticatedUid();
  const validId = validateId(journalId, "journal ID");
  const journalRef = doc(db, "users", uid, "journals", validId);
  const path = `users/${uid}/journals/${validId}`;

  try {
    await deleteDoc(journalRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * 7. ADD MESSAGE (Subcollection: users/{uid}/journals/{journalId}/messages/{messageId})
 */
export async function addMessage(
  journalId: string,
  message: { role: "user" | "assistant"; content: string }
): Promise<JournalMessage> {
  const uid = getAuthenticatedUid();
  const validJournalId = validateId(journalId, "journal ID");

  const trimmedContent = (message.content || "").trim();
  if (!trimmedContent) {
    throw new Error("Message content cannot be empty.");
  }
  if (trimmedContent.length > 10000) {
    throw new Error("Message content exceeds maximum allowed length.");
  }

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const messageRef = doc(db, "users", uid, "journals", validJournalId, "messages", messageId);
  const path = `users/${uid}/journals/${validJournalId}/messages/${messageId}`;
  const now = new Date().toISOString();

  const msgData: JournalMessage = {
    id: messageId,
    messageId,
    userId: uid,
    journalId: validJournalId,
    role: message.role,
    content: trimmedContent,
    createdAt: now,
  };

  try {
    await setDoc(messageRef, msgData);
    return msgData;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/**
 * 8. GET MESSAGES (Subcollection: users/{uid}/journals/{journalId}/messages)
 */
export async function getMessages(journalId: string): Promise<JournalMessage[]> {
  const uid = getAuthenticatedUid();
  const validJournalId = validateId(journalId, "journal ID");
  const messagesColl = collection(db, "users", uid, "journals", validJournalId, "messages");
  const path = `users/${uid}/journals/${validJournalId}/messages`;

  try {
    const q = query(messagesColl, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    const messages: JournalMessage[] = [];
    snapshot.forEach((snap) => {
      messages.push(snap.data() as JournalMessage);
    });
    return messages;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

/**
 * 9. SUBSCRIBE TO JOURNAL MESSAGES
 */
export function subscribeMessages(
  journalId: string,
  onData: (messages: JournalMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const uid = getAuthenticatedUid();
  const validJournalId = validateId(journalId, "journal ID");
  const messagesColl = collection(db, "users", uid, "journals", validJournalId, "messages");
  const path = `users/${uid}/journals/${validJournalId}/messages`;

  return onSnapshot(
    messagesColl,
    (snapshot) => {
      const messages: JournalMessage[] = [];
      snapshot.forEach((snap) => {
        messages.push(snap.data() as JournalMessage);
      });
      messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      onData(messages);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

/**
 * 10. BULK DELETE ALL USER JOURNALS
 * Securely deletes all journals belonging to the authenticated user.
 */
export async function deleteAllUserJournals(): Promise<number> {
  const uid = getAuthenticatedUid();
  const journalsColl = collection(db, "users", uid, "journals");
  const path = `users/${uid}/journals`;

  try {
    const snapshot = await getDocs(journalsColl);
    let count = 0;
    const deletePromises = snapshot.docs.map(async (d) => {
      await deleteDoc(d.ref);
      count++;
    });
    await Promise.all(deletePromises);
    return count;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
