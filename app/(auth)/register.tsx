/*
=======================================================
NITRO SYNC - REGISTRO DE USUARIO
=======================================================

Esta pantalla permite crear una cuenta nueva en
Firebase Authentication.

Firebase utiliza:
createUserWithEmailAndPassword()

DISEÑO:
Mismo lógica de diseño que el inicio de sesión
(hero con degradado + tarjeta de formulario), para
mantener una experiencia consistente. Las validaciones
y el manejo de errores NO cambiaron.

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

import { createUserWithEmailAndPassword } from 'firebase/auth';

import { auth } from '../../firebaseConfig';

import {
  Gradientes,
  Paleta,
  Radios,
  sombraDura,
} from '@/constants/theme';

import BotonNitro from '@/components/ui/boton-nitro';
import { useAlerta } from '@/components/ui/confirm-dialog';

export default function RegisterScreen() {
  const alerta = useAlerta();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);

  /*
  =========================================================
  FUNCIÓN DE REGISTRO
  =========================================================
  */

  const handleRegister = async () => {
    /* Validación de campos vacíos */

    if (!email.trim() || !password || !confirmPassword) {
      await alerta({
        titulo: 'Campos incompletos',
        mensaje: 'Completa todos los campos.',
        tipo: 'advertencia',
      });

      return;
    }

    /* Validación de contraseña */

    if (password.length < 6) {
      await alerta({
        titulo: 'Contraseña muy corta',
        mensaje: 'La contraseña debe tener al menos 6 caracteres.',
        tipo: 'advertencia',
      });

      return;
    }

    /* Confirmación de contraseña */

    if (password !== confirmPassword) {
      await alerta({
        titulo: 'Las contraseñas no coinciden',
        mensaje: 'Revisa que ambas contraseñas sean iguales.',
        tipo: 'advertencia',
      });

      return;
    }

    try {
      setLoading(true);

      /*
      ==================================================
      CREAR USUARIO EN FIREBASE
      ==================================================
      */

      await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      /*
      Firebase crea la sesión automáticamente.
      La navegación protegida muestra las pestañas.
      */
    } catch (error: any) {
      let mensaje = 'No fue posible crear la cuenta.';

      if (error.code === 'auth/email-already-in-use') {
        mensaje = 'Este correo ya está registrado.';
      } else if (error.code === 'auth/invalid-email') {
        mensaje = 'El correo electrónico no es válido.';
      } else if (error.code === 'auth/weak-password') {
        mensaje = 'La contraseña es demasiado débil.';
      } else if (error.code === 'auth/network-request-failed') {
        mensaje = 'Sin conexión a internet. Revisa tu red.';
      }

      await alerta({
        titulo: 'Error de registro',
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
            <Ionicons name="person-add" size={28} color={Paleta.tinta} />
          </View>

          <Text style={styles.titulo}>Crea tu cuenta</Text>

          <Text style={styles.subtitulo}>
            Todo tu garaje bajo control desde el primer día.
          </Text>
        </LinearGradient>

        {/* =================================================
            TARJETA DE FORMULARIO
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.tarjetaTitulo}>Regístrate</Text>

          <Text style={styles.tarjetaSubtitulo}>
            Solo te tomará un minuto
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
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Text style={styles.etiqueta}>Confirmar contraseña</Text>

          <View style={styles.inputCaja}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={Paleta.textoSuave}
              style={styles.inputIcono}
            />

            <TextInput
              style={styles.input}
              placeholder="Repite tu contraseña"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          {/* BOTÓN CREAR CUENTA */}

          <BotonNitro
            titulo="Crear cuenta"
            iconoDerecha="person-add"
            onPress={handleRegister}
            cargando={loading}
            style={styles.botonPrincipal}
          />

          {/* BOTÓN INICIAR SESIÓN */}

          <BotonNitro
            titulo="Ya tengo una cuenta"
            variante="secundario"
            tamano="mediano"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.botonSecundario}
          />

          <Pressable
            style={styles.linkButton}
            onPress={() => router.replace('/(auth)/login')}
            accessibilityRole="link"
          >
            <Text style={styles.linkTexto}>
              ¿Ya tienes cuenta? Inicia sesión
            </Text>
          </Pressable>
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
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 58,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },

  heroBurbuja: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(200,255,61,0.10)',
    top: -115,
    left: -80,
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
    width: 64,
    height: 64,
    borderRadius: 21,
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
    marginTop: -36,
    ...sombraDura(6, 6),
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
    marginBottom: 18,
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
