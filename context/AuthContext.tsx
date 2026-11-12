/*
========================================================
NITRO SYNC - AUTH CONTEXT
========================================================

Este contexto administra globalmente la autenticación
del usuario mediante Firebase Authentication.

Permite:

- Saber si existe un usuario autenticado.
- Detectar automáticamente cambios de sesión.
- Mantener la sesión.
- Cerrar sesión.
- Compartir el usuario con todas las pantallas.

========================================================
*/

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  User,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';

import { auth } from '../firebaseConfig';

import { cancelarNotificacionesUsuario } from '@/services/notificationService';
import { esAdministrador } from '@/services/roles';

/*
========================================================
TIPO DEL CONTEXTO
========================================================
*/

interface AuthContextType {
  user: User | null;
  loading: boolean;
  esAdmin: boolean;
  logout: () => Promise<void>;
}

/*
========================================================
CREACIÓN DEL CONTEXTO
========================================================
*/

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  esAdmin: false,
  logout: async () => {},
});

/*
========================================================
AUTH PROVIDER
========================================================

Este componente envuelve la aplicación y permite
compartir la información de autenticación con todas
las pantallas.
========================================================
*/

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [esAdmin, setEsAdmin] = useState(false);
  const [cargandoRol, setCargandoRol] = useState(false);

  /*
  ======================================================
  ESCUCHAR CAMBIOS DE AUTENTICACIÓN
  ======================================================

  Firebase informa automáticamente cuando:

  - El usuario inicia sesión.
  - El usuario cierra sesión.
  - Firebase recupera una sesión existente.
  */

  useEffect(() => {
    let secuencia = 0;

    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      const actual = ++secuencia;

      if (!usuario) {
        setUser(null);
        setEsAdmin(false);
        setCargandoRol(false);
        setLoading(false);
        return;
      }

      setCargandoRol(true);
      setUser(usuario);
      setLoading(false);

      esAdministrador(usuario.uid).then((admin) => {
        if (actual !== secuencia) {
          return;
        }

        setEsAdmin(admin);
        setCargandoRol(false);
      });
    });

    return unsubscribe;
  }, []);

  /*
  ======================================================
  CERRAR SESIÓN
  ======================================================
  */

  const logout = async () => {
    /*
    Cancela las notificaciones locales del usuario que
    cierra sesión para no dejar avisos de una cuenta que
    ya no está activa. Si falla, no impide cerrar sesión.
    */
    if (user) {
      await cancelarNotificacionesUsuario(user.uid).catch(() => {});
    }

    await signOut(auth);
  };

  /*
  ======================================================
  PROVEER INFORMACIÓN A LA APLICACIÓN
  ======================================================
  */

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: loading || cargandoRol,
        esAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/*
========================================================
HOOK PERSONALIZADO
========================================================

Permite utilizar la información de autenticación
desde cualquier pantalla:

const { user, loading, logout } = useAuth();

========================================================
*/

export function useAuth() {
  return useContext(AuthContext);
}