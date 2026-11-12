/*
=======================================================
NITRO SYNC - INICIO DE SESIÓN
=======================================================

Esta pantalla permite iniciar sesión utilizando
Firebase Authentication.

Firebase utiliza:
signInWithEmailAndPassword()

DISEÑO:
Hero con degradado de marca + tarjeta de formulario
con campos etiquetados. La lógica de autenticación y el
manejo de errores NO cambió.

=======================================================
*/

import { useState } from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth } from '../../firebaseConfig';

import {
  Gradientes,
  Paleta,
  Radios,
  sombraDura,
} from '@/constants/theme';

import { esAdministrador } from '@/services/roles';
import BotonNitro from '@/components/ui/boton-nitro';
import { useAlerta } from '@/components/ui/confirm-dialog';

export default function LoginScreen() {
  const alerta = useAlerta();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [modoAdmin, setModoAdmin] = useState(false);

  /*
  =========================================================
  FUNCIÓN DE LOGIN
  =========================================================
  */

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      await alerta({
        titulo: 'Campos incompletos',
        mensaje: 'Ingresa tu correo y contraseña.',
        tipo: 'advertencia',
      });

      return;
    }

    try {
      setLoading(true);

      /*
      ==================================================
      INICIAR SESIÓN EN FIREBASE
      ==================================================
      */

      const credencial = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      if (modoAdmin && !(await esAdministrador(credencial.user.uid))) {
        await signOut(auth);

        await alerta({
          titulo: 'Acceso restringido',
          mensaje: 'Esta cuenta no tiene permisos de administrador.',
          tipo: 'error',
        });

        return;
      }

      /*
      Firebase ya tiene la sesión del usuario.
      La navegación protegida muestra las pestañas.
      */
    } catch (error: any) {
      let mensaje = 'No fue posible iniciar sesión.';

      if (error.code === 'auth/invalid-credential') {
        mensaje = 'El correo o la contraseña son incorrectos.';
      } else if (error.code === 'auth/user-not-found') {
        mensaje = 'No existe una cuenta con este correo.';
      } else if (error.code === 'auth/wrong-password') {
        mensaje = 'La contraseña es incorrecta.';
      } else if (error.code === 'auth/invalid-email') {
        mensaje = 'El correo electrónico no es válido.';
      } else if (error.code === 'auth/too-many-requests') {
        mensaje = 'Demasiados intentos. Espera unos minutos.';
      } else if (error.code === 'auth/network-request-failed') {
        mensaje = 'Sin conexión a internet. Revisa tu red.';
      }

      await alerta({
        titulo: 'Error de inicio de sesión',
        mensaje,
        tipo: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true} persistentScrollbar
      >
        {/* =================================================
            HERO CON DEGRADADO
            ================================================= */}

        <LinearGradient
          colors={Gradientes.marca}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View pointerEvents="none" style={styles.heroBurbuja} />

          <Text style={styles.marca}>
            NITRO <Text style={styles.marcaAcento}>SYNC</Text>
          </Text>

          <View style={styles.logoCaja}>
            <Ionicons
              name={modoAdmin ? 'shield-checkmark' : 'speedometer'}
              size={30}
              color={Paleta.tinta}
            />
          </View>

          <Text style={styles.titulo}>
            {modoAdmin ? 'Acceso administrador' : 'Tu garaje, al día.'}
          </Text>

          <Text style={styles.subtitulo}>
            {modoAdmin
              ? 'Gestiona los vehículos afiliados y sus seguros.'
              : 'SOAT, seguro, mantenimiento y gastos en un solo lugar.'}
          </Text>
        </LinearGradient>

        {/* =================================================
            TARJETA DE FORMULARIO
            ================================================= */}

        <View style={styles.tarjeta}>
          <View style={styles.segmentos}>
            {[
              { texto: 'Usuario', admin: false },
              { texto: 'Administrador', admin: true },
            ].map((opcion) => (
              <Pressable
                key={opcion.texto}
                onPress={() => setModoAdmin(opcion.admin)}
                style={[
                  styles.segmento,
                  modoAdmin === opcion.admin && styles.segmentoActivo,
                ]}
              >
                <Text
                  style={[
                    styles.segmentoTexto,
                    modoAdmin === opcion.admin && styles.segmentoTextoActivo,
                  ]}
                >
                  {opcion.texto}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.tarjetaTitulo}>
            {modoAdmin ? 'Ingreso de administrador' : 'Iniciar sesión'}
          </Text>

          <Text style={styles.tarjetaSubtitulo}>
            {modoAdmin ? 'Solo personal autorizado' : 'Bienvenido de nuevo'}
          </Text>

          <Text style={styles.etiqueta}>Correo electrónico</Text>

          <View style={styles.inputCaja}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={Paleta.textoSuave}
              style={styles.inputIcono}
            />

            <TextInput
              style={styles.input}
              placeholder="tucorreo@ejemplo.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={styles.etiqueta}>Contraseña</Text>

          <View style={styles.inputCaja}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={Paleta.textoSuave}
              style={styles.inputIcono}
            />

            <TextInput
              style={styles.input}
              placeholder="Tu contraseña"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* BOTÓN INICIAR SESIÓN */}

          <BotonNitro
            titulo="Iniciar sesión"
            iconoDerecha="arrow-forward"
            onPress={handleLogin}
            cargando={loading}
            style={styles.botonPrincipal}
          />

          {!modoAdmin && (
            <>
              <BotonNitro
                titulo="Crear una cuenta"
                variante="secundario"
                tamano="mediano"
                onPress={() => router.replace('/(auth)/register')}
                style={styles.botonSecundario}
              />

              <Pressable
                style={styles.linkButton}
                onPress={() => router.replace('/(auth)/register')}
                accessibilityRole="link"
              >
                <Text style={styles.linkTexto}>
                  ¿No tienes una cuenta? Regístrate
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/*
=======================================================
ESTILOS
=======================================================
*/

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Paleta.fondo,
  },

  scroll: {
    flexGrow: 1,
  },

  /* -----------------------------
     HERO
     ----------------------------- */

  hero: {
    alignItems: 'center',
    paddingTop: 78,
    paddingHorizontal: 24,
    paddingBottom: 62,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },

  heroBurbuja: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(200,255,61,0.10)',
    top: -110,
    right: -70,
  },

  marca: {
    fontSize: 12,
    fontWeight: '900',
    color: Paleta.blanco,
    letterSpacing: 3.4,
    marginBottom: 14,
  },

  marcaAcento: {
    color: Paleta.acento,
  },

  logoCaja: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: Paleta.acento,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...sombraDura(4, 4, 'rgba(0,0,0,0.35)'),
  },

  titulo: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.6,
  },

  subtitulo: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
    lineHeight: 20,
  },

  /* -----------------------------
     TARJETA
     ----------------------------- */

  tarjeta: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.grande,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    padding: 24,
    marginHorizontal: 18,
    marginTop: -40,
    ...sombraDura(6, 6),
  },

  segmentos: {
    flexDirection: 'row',
    backgroundColor: Paleta.fondoAlterno,
    borderRadius: Radios.suave,
    padding: 4,
    marginBottom: 18,
  },

  segmento: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },

  segmentoActivo: {
    backgroundColor: Paleta.tinta,
  },

  segmentoTexto: {
    fontSize: 13,
    fontWeight: '800',
    color: Paleta.textoSecundario,
  },

  segmentoTextoActivo: {
    color: Paleta.acento,
  },

  tarjetaTitulo: {
    fontSize: 21,
    fontWeight: '800',
    color: Paleta.texto,
    textAlign: 'center',
  },

  tarjetaSubtitulo: {
    fontSize: 14,
    textAlign: 'center',
    color: Paleta.textoSecundario,
    marginBottom: 20,
    marginTop: 4,
  },

  /* -----------------------------
     CAMPOS
     ----------------------------- */

  etiqueta: {
    fontSize: 13,
    fontWeight: '700',
    color: Paleta.textoSecundario,
    marginBottom: 6,
  },

  inputCaja: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Paleta.fondo,
    borderWidth: 1,
    borderColor: Paleta.borde,
    borderRadius: Radios.suave,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 52,
  },

  inputIcono: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: Paleta.texto,
    padding: 0,
  },

  /* -----------------------------
     BOTONES
     ----------------------------- */

  botonPrincipal: {
    marginTop: 10,
  },

  botonSecundario: {
    marginTop: 12,
  },

  linkButton: {
    marginTop: 18,
    alignItems: 'center',
  },

  linkTexto: {
    color: Paleta.primario,
    fontSize: 14,
    fontWeight: '600',
  },
});
