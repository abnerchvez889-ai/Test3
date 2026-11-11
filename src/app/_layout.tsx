import { NavigationBar } from "expo-navigation-bar";
import { Stack } from "expo-router";
import { Component, useEffect } from "react";
import { Platform, Pressable, Text, View } from "react-native";

class Protegido extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { fallo: false };
  }

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  render() {
    if (this.state.fallo) {
      return (
        <View style={pantallaFallo}>
          <Text style={textoFallo}>Algo salio mal. Toca reintentar.</Text>

          <Pressable
            onPress={() => this.setState({ fallo: false })}
            style={botonFallo}
          >
            <Text style={botonFalloTexto}>Reintentar</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "android") {
      try {
        NavigationBar.setHidden(true);
      } catch (e) {
        // si el telefono no deja ocultarla, la app sigue funcionando igual
      }
    }
  }, []);

  return (
    <Protegido>
      <Stack />
    </Protegido>
  );
}

const pantallaFallo = {
  flex: 1,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  padding: 30,
  backgroundColor: "#fff",
};

const textoFallo = { fontSize: 16, color: "#333", textAlign: "center" as const };

const botonFallo = {
  marginTop: 16,
  backgroundColor: "#333",
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 20,
};

const botonFalloTexto = { color: "#fff", fontSize: 14 };
