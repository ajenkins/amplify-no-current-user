import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Button } from "react-native";
import Amplify, { Auth } from "aws-amplify";
import { withAuthenticator } from "aws-amplify-react-native";
import { Provider, useQuery } from "urql";

import awsconfig from "./aws-exports";
import client from "./urql-client";

Amplify.configure({ ...awsconfig, Analytics: { disabled: true } });

const GET_USERS = `
  query GetUsers {
    users_public {
      id
      name
    }
  }
`;

function DataTest() {
  const [{ data, fetching, error }] = useQuery({ query: GET_USERS });
  console.log(data);
  console.log(fetching);
  console.log(error?.message);
  return <Button title="Sign Out" onPress={() => Auth.signOut()} />;
}

function App() {
  return (
    <Provider value={client}>
      <View style={styles.container}>
        <Text>Open up App.js to start working on your app!</Text>
        <DataTest />
        <StatusBar style="auto" />
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default withAuthenticator(App, { usernameAttributes: "phone_number" });
