import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, "usuarios", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            ...docSnap.data(),
          });
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
          });
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email, senha, tipo, nome) => {
    try {
      const credenciais = await createUserWithEmailAndPassword(auth, email, senha);
      const user = credenciais.user;

      await setDoc(doc(db, "usuarios", user.uid), {
        nome: nome || "Usuário",
        email: user.email,
        tipo: tipo,
        criadoEm: new Date(),
      });
    } catch (erro) {
      throw erro; 
    }
  };

  const login = async (email, senha) => {
    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch (erro) {
      throw erro;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (erro) {
      throw erro;
    }
  };

  const value = {
    user,
    signup,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}