import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, query, where, getDocs, updateDoc, doc, getDoc, setDoc } from "firebase/firestore";

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
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            ...docSnap.data(),
          };
          setUser(userData);

          if (userData.tipo === "aluno") {
            const pendentes = await getDocs(query(
              collection(db, "enrollments"),
              where("email", "==", firebaseUser.email.toLowerCase()),
              where("userId", "==", null)
            ));
            const updates = pendentes.docs.map((d) =>
              updateDoc(doc(db, "enrollments", d.id), {
                userId: firebaseUser.uid,
                nome: userData.nome || "",
              })
            );
            await Promise.all(updates);
          }
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
    const newUser = credenciais.user;

    await setDoc(doc(db, "usuarios", newUser.uid), {
      nome: nome || "Usuário",
      email: newUser.email,
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

  const value = { user, signup, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}