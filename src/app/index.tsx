import { useAudioPlayer } from "expo-audio";
import { useEffect, useState } from "react";
import { Button, FlatList, Image, Text, View } from "react-native";

export default function Index() {
  const [pokemon, setPokemon] = useState<any[]>([]);

  const player = useAudioPlayer(null);

  useEffect(() => {
    fetch("https://pokeapi.co/api/v2/pokemon?limit=151&offset=0")
      .then((res) => res.json())
      .then((data) => setPokemon(data.results));
  }, []);

  const playAudio = (Audio: string) => {
    player.replace(Audio);
    player.play();
  };

  return (
    <View style={{ paddingTop: 50, flex: 1 }}>
      <FlatList
        data={pokemon}
        keyExtractor={(item) => item.name}
        renderItem={({ item, index }) => {
          const id = index + 1;
          const Audio = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;
          return (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={{
                  uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
                }}
                style={{ width: 96, height: 96 }}
              />
              <Text style={{ padding: 10 }}>{item.name}</Text>
              <Button title="Audio" onPress={() => playAudio(Audio)} />
            </View>
          );
        }}
      />
    </View>
  );
}
