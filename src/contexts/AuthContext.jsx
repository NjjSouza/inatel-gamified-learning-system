import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

// cria o contexto
const AuthContext = createContext();

// hook personalizado
export function useAuth() {
  return useContext(AuthContext);
}

// provider (envolve o app)
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
    const credenciais = await createUserWithEmailAndPassword(auth, email, senha);
    const user = credenciais.user;

    await setDoc(doc(db, "usuarios", user.uid), {
      nome: nome || "Usuário",
      email: user.email,
      tipo: tipo,
      criadoEm: new Date(),
    });
  };

  const login = async (email, senha) => {
    await signInWithEmailAndPassword(auth, email, senha);
  };

  const logout = async () => {
    await signOut(auth);
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