import { Text, View } from "react-native";
import { MissingWidget } from "./src/MissingWidget";

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Broken Expo Fixture</Text>
      <MissingWidget />
    </View>
  );
}
