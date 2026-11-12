import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/firebaseConfig';

export async function esAdministrador(uid: string): Promise<boolean> {
  try {
    const snapshot = await getDoc(doc(db, 'administradores', uid));

    return snapshot.exists();
  } catch {
    return false;
  }
}
