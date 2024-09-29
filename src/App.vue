<template>
  <v-app id="app">
    <v-navigation-drawer v-model="drawer" app> 탭 안에 있을 UI </v-navigation-drawer>

    <v-app-bar app>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>Test Application</v-toolbar-title>
    </v-app-bar>

    <v-main>
      <v-card class="mx-auto" max-width="344">
        <v-card-text>
          <div>기본 UI 설정</div>
          <p class="display-1 text--primary">responsive web design</p>
          <div class="text--primary">TEST Page</div>
        </v-card-text>
        <v-card-actions>
          <v-btn text color="deep-purple accent-4"> Learn More </v-btn>
        </v-card-actions>
      </v-card>
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      drawer: null
    }
  }
}
</script>
