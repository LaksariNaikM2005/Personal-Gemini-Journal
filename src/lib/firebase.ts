import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocFromServer,
  Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { JournalEntry, Conversation, UserProfile } from "../types";

// 1. Initialize Firebase App and Services
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: The app must pass firestoreDatabaseId to getFirestore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// 2. Validate connection on initial load
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore client appears offline. Please check network/Firebase configuration.");
      return false;
    }
    // Permission denied on 'test/connection' is expected since rules forbid unknown collections
    return true;
  }
}
testFirestoreConnection();

// 3. Robust Firestore Error Handling as required by guidelines
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Security/Operation Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 4. Authentication helpers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function loginWithGoogle(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    // Sync user profile document
    await syncUserProfile(user);
    return user;
  } catch (err: unknown) {
    console.error("Google Sign-In failed:", err);
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function syncUserProfile(user: FirebaseUser): Promise<void> {
  const userRef = doc(db, "users", user.uid);
  const path = `users/${user.uid}`;
  try {
    const userDoc = await getDoc(userRef);
    const now = new Date().toISOString();
    if (!userDoc.exists()) {
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "Journaler",
        photoURL: user.photoURL || null,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };
      await setDoc(userRef, newProfile);
    } else {
      await updateDoc(userRef, {
        displayName: user.displayName || "Journaler",
        photoURL: user.photoURL || null,
        updatedAt: now,
        lastLoginAt: now,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 5. Journal Operations (Strictly isolated by authenticated userId)
export async function saveJournalEntry(
  userId: string,
  entry: Omit<JournalEntry, "id" | "userId" | "createdAt" | "updatedAt">,
  existingId?: string
): Promise<string> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || currentUid !== userId) {
    throw new Error("Unauthorized: Cannot save journal under another user ID.");
  }

  const id = existingId || `jnl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const journalRef = doc(db, "users", userId, "journals", id);
  const path = `users/${userId}/journals/${id}`;
  const now = new Date().toISOString();

  try {
    if (existingId) {
      const updatePayload = {
        title: entry.title.slice(0, 300),
        content: entry.content.slice(0, 50000),
        tags: (entry.tags || []).slice(0, 20),
        mood: (entry.mood || "Reflective").slice(0, 50),
        ...(entry.aiSummary ? { aiSummary: entry.aiSummary.slice(0, 5000) } : {}),
        updatedAt: now,
        userId,
      };
      await updateDoc(journalRef, updatePayload);
    } else {
      const createPayload: JournalEntry = {
        id,
        title: entry.title.slice(0, 300),
        content: entry.content.slice(0, 50000),
        tags: (entry.tags || []).slice(0, 20),
        mood: (entry.mood || "Reflective").slice(0, 50),
        aiSummary: entry.aiSummary ? entry.aiSummary.slice(0, 5000) : "",
        createdAt: now,
        updatedAt: now,
        userId,
      };
      await setDoc(journalRef, createPayload);
    }
    return id;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function deleteJournalEntry(userId: string, journalId: string): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || currentUid !== userId) {
    throw new Error("Unauthorized: Cannot delete journal belonging to another user.");
  }

  const journalRef = doc(db, "users", userId, "journals", journalId);
  const path = `users/${userId}/journals/${journalId}`;
  try {
    await deleteDoc(journalRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserJournals(
  userId: string,
  onData: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const journalsRef = collection(db, "users", userId, "journals");
  const path = `users/${userId}/journals`;

  return onSnapshot(
    journalsRef,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push(docSnap.data() as JournalEntry);
      });
      // Sort newest first
      entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(entries);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// 6. Conversation Operations (Strictly isolated by authenticated userId)
export async function saveConversation(
  userId: string,
  conversation: Omit<Conversation, "id" | "userId" | "createdAt" | "updatedAt">,
  existingId?: string
): Promise<string> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || currentUid !== userId) {
    throw new Error("Unauthorized: Cannot save conversation under another user ID.");
  }

  const id = existingId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const convRef = doc(db, "users", userId, "conversations", id);
  const path = `users/${userId}/conversations/${id}`;
  const now = new Date().toISOString();

  try {
    if (existingId) {
      await updateDoc(convRef, {
        title: (conversation.title || "Brainstorming Session").slice(0, 200),
        messages: conversation.messages.slice(0, 100),
        journalId: conversation.journalId || null,
        journalTitle: conversation.journalTitle || null,
        updatedAt: now,
        userId,
      });
    } else {
      const newConv: Conversation = {
        id,
        userId,
        title: (conversation.title || "Brainstorming Session").slice(0, 200),
        journalId: conversation.journalId || null,
        journalTitle: conversation.journalTitle || null,
        messages: conversation.messages.slice(0, 100),
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(convRef, newConv);
    }
    return id;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || currentUid !== userId) {
    throw new Error("Unauthorized: Cannot delete conversation belonging to another user.");
  }

  const convRef = doc(db, "users", userId, "conversations", conversationId);
  const path = `users/${userId}/conversations/${conversationId}`;
  try {
    await deleteDoc(convRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserConversations(
  userId: string,
  onData: (convs: Conversation[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const convsRef = collection(db, "users", userId, "conversations");
  const path = `users/${userId}/conversations`;

  return onSnapshot(
    convsRef,
    (snapshot) => {
      const convs: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        convs.push(docSnap.data() as Conversation);
      });
      // Sort newest first
      convs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onData(convs);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
