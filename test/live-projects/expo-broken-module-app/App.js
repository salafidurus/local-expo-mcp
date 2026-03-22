import { Text, View } from "react-native";
import { MissingWidget } from "./src/MissingWidget";

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Expo Broken Module App</Text>
      <MissingWidget />
    </View>
  );
}
