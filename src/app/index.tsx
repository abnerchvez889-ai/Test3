import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { CameraView, useCameraPermissions } from "expo-camera";
import { File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Image,
  Platform,
  Pressable,
  Text,
  Vibration,
  View,
} from "react-native";

export default function Index() {
  const [pokemon, setPokemon] = useState<any[]>([]);
  const [detalle, setDetalle] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [movimiento, setMovimiento] = useState("quieto");
  const [mostrarCamara, setMostrarCamara] = useState(false);

  const [permiso, pedirPermiso] = useCameraPermissions();

  const ultimoPedido = useRef(0);
  const ultimoId = useRef(0);
  const ultimoGolpe = useRef(0);
  const camaraRef = useRef<CameraView>(null);
  const player = useAudioPlayer(null, { downloadFirst: true });

  function vibrar(fuerte: boolean) {
    try {
      if (Platform.OS === "android") {
        if (fuerte) {
          Vibration.vibrate([0, 600, 200, 600, 200, 900], false);
        } else {
          Vibration.vibrate(300);
        }
      }
    } catch (e) {
      console.log("vibracion:", String(e));
    }

    Haptics.impactAsync(
      fuerte ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light
    ).catch(() => {});
  }

  function playAudio(Audio: string) {
    vibrar(false);

    try {
      player.replace(Audio);
      player.play();
    } catch (e) {
      Alert.alert("Audio", "No se pudo reproducir el audio");
    }
  }

  const tomarFoto = async () => {
    if (camaraRef.current && permiso?.granted) {
      vibrar(true);

      const foto = await camaraRef.current.takePictureAsync();

      if (foto) {
        try {
          const archivoOriginal = new File(foto.uri);
          const archivoNuevo = new File(Paths.document, `pokemon_${Date.now()}.jpg`);

          await archivoOriginal.copy(archivoNuevo);

          Alert.alert("Camara", "Foto guardada en el dispositivo");
        } catch (e) {
          Alert.alert("Camara", "Error al guardar la foto");
        }

        setMostrarCamara(false);
      }
    }
  };

  async function cargarLista() {
    setError("");
    setCargando(true);

    for (let intento = 1; intento <= 3; intento++) {
      try {
        const respuesta = await fetch(
          "https://pokeapi.co/api/v2/pokemon?limit=151&offset=0"
        );

        if (!respuesta.ok) {
          throw new Error("Respuesta " + respuesta.status);
        }

        const datos = await respuesta.json();
        setPokemon(datos.results);
        setCargando(false);
        return;
      } catch (e) {
        if (intento === 3) {
          setError(msjError(e));
        } else {
          await new Promise((listo) => setTimeout(listo, 1200));
        }
      }
    }

    setCargando(false);
  }

  async function cargarFavoritos() {
    const lista = await obtenerFavoritos();
    setFavoritos(lista);
  }

  async function alternarFavorito(nombre: string) {
    let listo = false;

    if (favoritos.includes(nombre)) {
      listo = await quitarFavorito(nombre);
    } else {
      listo = await guardarFavorito(nombre);
    }

    if (!listo) {
      Alert.alert("Favoritos", "No se pudo guardar, intenta otra vez");
      return;
    }

    await cargarFavoritos();
  }

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});

    if (!permiso?.granted) {
      pedirPermiso();
    }

    cargarLista();
    cargarFavoritos();

    let sensor: any = null;

    try {
      Accelerometer.setUpdateInterval(300);

      sensor = Accelerometer.addListener((datos) => {
        const fuerza = Math.sqrt(
          datos.x * datos.x + datos.y * datos.y + datos.z * datos.z
        );

        if (fuerza > 2.5) {
          setMovimiento("movimiento detectado");

          const ahora = Date.now();

          if (ahora - ultimoGolpe.current > 2000 && ultimoId.current > 0) {
            ultimoGolpe.current = ahora;
            playAudio(
              `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${ultimoId.current}.ogg`
            );
          }
        } else {
          setMovimiento("quieto");
        }
      });
    } catch (e) {
      setMovimiento("sensor no disponible");
    }

    return () => {
      if (sensor) {
        sensor.remove();
      }
    };
  }, []);

  async function verDetalle(url: string, id: number) {
    ultimoPedido.current = ultimoPedido.current + 1;
    const numero = ultimoPedido.current;

    ultimoId.current = id;

    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch(url);

      if (!respuesta.ok) {
        setError("No se pudieron cargar los datos, toca el pokemon otra vez");
        return;
      }

      const datos = await respuesta.json();

      if (numero === ultimoPedido.current) {
        setDetalle(datos);
      }
    } catch (e) {
      if (numero === ultimoPedido.current) {
        setError(msjError(e));
      }
    } finally {
      if (numero === ultimoPedido.current) {
        setCargando(false);
      }
    }
  }

  if (mostrarCamara) {
    if (!permiso?.granted) {
      return (
        <View style={camaraPantalla}>
          <Text style={{ color: "#fff", marginBottom: 20 }}>
            Necesitamos permiso para la camara
          </Text>
          <Button title="Dar permiso" onPress={pedirPermiso} />
          <Button title="Volver" color="red" onPress={() => setMostrarCamara(false)} />
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <CameraView style={{ flex: 1 }} ref={camaraRef} />
        <View style={{ position: "absolute", bottom: 40, width: "100%", padding: 20, gap: 10 }}>
          <Button title="Tomar foto" onPress={tomarFoto} />
          <Button title="Cancelar" color="red" onPress={() => setMostrarCamara(false)} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: 50, backgroundColor: "#fff" }}>
      <View style={{ padding: 10 }}>
        <Button title="Abrir camara" onPress={() => setMostrarCamara(true)} />
      </View>

      <View style={cajaChica}>
        <Text style={lineaChica}>Sensor: {movimiento}</Text>
        <Text style={lineaChica}>Favoritos guardados: {favoritos.length}</Text>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={pokemon}
        keyExtractor={(item) => item.name}
        renderItem={({ item, index }) => {
          const id = index + 1;
          const Audio = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;

          return (
            <View style={fila}>
              <Pressable
                onPress={() => verDetalle(item.url, id)}
                style={filaTocable}
              >
                <Image
                  source={{
                    uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
                  }}
                  style={{ width: 72, height: 72 }}
                />
                <Text style={{ fontSize: 16, padding: 10, color: "#000" }}>
                  {item.name}
                </Text>
              </Pressable>

              <Pressable onPress={() => alternarFavorito(item.name)}>
                <Text style={estrella}>
                  {favoritos.includes(item.name) ? "★" : "☆"}
                </Text>
              </Pressable>

              <Button title="Audio" onPress={() => playAudio(Audio)} />
            </View>
          );
        }}
      />

      {cargando ? (
        <View style={aviso}>
          <ActivityIndicator />
          <Text style={{ fontSize: 14, color: "#888", marginTop: 8 }}>
            Cargando datos...
          </Text>
        </View>
      ) : error ? (
        <View style={panel}>
          <Text style={{ fontSize: 14, color: "#a00" }}>{error}</Text>
          <View style={{ marginTop: 10 }}>
            <Button
              title="Reintentar"
              onPress={() => {
                setError("");
                cargarLista();
              }}
            />
          </View>
        </View>
      ) : detalle ? (
        <View style={panel}>
          <Text style={titulo}>{detalle.name}</Text>
          <Text style={linea}>
            Tipos: {detalle.types?.map((t: any) => t.type.name).join(", ")}
          </Text>
          <Text style={linea}>Altura: {detalle.height / 10} m</Text>
          <Text style={linea}>Peso: {detalle.weight / 10} kg</Text>
          <Text style={linea}>
            Habilidades: {detalle.abilities?.map((a: any) => a.ability.name).join(", ")}
          </Text>
          <Text style={linea}>
            Stats: {detalle.stats?.map((s: any) => `${s.stat.name} ${s.base_stat}`).join(" · ")}
          </Text>
          <View style={{ marginTop: 10 }}>
            <Button title="Cerrar" onPress={() => setDetalle(null)} />
          </View>
        </View>
      ) : (
        <View style={aviso}>
          <Text style={{ fontSize: 15, color: "#888", textAlign: "center" }}>
            Toca un pokemon para ver sus stats :D
          </Text>
        </View>
      )}
    </View>
  );
}

function msjError(e: any) {
  const texto = String(e);

  if (texto.includes("CertPathValidator") || texto.includes("SSLHandshake")) {
    return "El telefono no pudo validar el certificado de pokeapi.co. Revisa la fecha y hora del telefono, apaga el Wi-Fi y usa datos moviles, o apaga el antivirus con escaneo de HTTPS.";
  }

  if (texto.includes("Network request failed") || texto.includes("fetch failed")) {
    return "No hay conexion a internet. Revisa tu red y toca Reintentar.";
  }

  if (texto.includes("Respuesta")) {
    return "El servidor de pokemon respondio con error. Toca Reintentar.";
  }

  return "No se pudo cargar la lista. Toca Reintentar.";
}

const LLAVE = "favoritos_pokemon";

async function obtenerFavoritos() {
  try {
    const texto = await AsyncStorage.getItem(LLAVE);

    if (texto === null) {
      return [];
    }

    return JSON.parse(texto);
  } catch (e) {
    return [];
  }
}

async function guardarFavorito(nombre: string) {
  try {
    const lista = await obtenerFavoritos();

    if (lista.includes(nombre)) {
      return true;
    }

    lista.push(nombre);
    await AsyncStorage.setItem(LLAVE, JSON.stringify(lista));

    return true;
  } catch (e) {
    return false;
  }
}

async function quitarFavorito(nombre: string) {
  try {
    const lista = await obtenerFavoritos();
    const restantes = lista.filter((n: string) => n !== nombre);

    await AsyncStorage.setItem(LLAVE, JSON.stringify(restantes));

    return true;
  } catch (e) {
    return false;
  }
}

const camaraPantalla = {
  flex: 1,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: "#000",
};

const cajaChica = {
  backgroundColor: "#f5f5f5",
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 10,
  padding: 10,
  marginHorizontal: 12,
  marginBottom: 8,
};

const lineaChica = { fontSize: 12, color: "#333", marginBottom: 2 };

const fila = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  paddingHorizontal: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#eee",
};

const filaTocable = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  flex: 1,
};

const estrella = { fontSize: 22, color: "#E0A800", paddingHorizontal: 8 };

const panel = {
  backgroundColor: "#f5f5f5",
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 12,
  padding: 14,
  margin: 12,
};

const titulo = {
  fontSize: 18,
  fontWeight: "bold" as const,
  color: "#000",
  textTransform: "capitalize" as const,
  marginBottom: 6,
};

const linea = { fontSize: 14, color: "#333", marginBottom: 2 };

const aviso = { padding: 30, alignItems: "center" as const };
