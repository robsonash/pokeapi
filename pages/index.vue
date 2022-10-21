<template>
  <div id="page-pokemons">
    <v-container v-if="!loadingGeral">
      <v-row class="d-flex justify-center align-center">
        <v-col class="d-flex justify-center align-center" cols="12" lg="12">
          <div class="c-search">
            <img src="./../assets/images/pokemon.png" />
            <v-col cols="12" sm="12" md="12">
              <v-autocomplete
                v-if="nomesPokemons !== null"
                v-model="pokemon"
                :items="nomesPokemons"
                item-text="name"
                label="Qual pokémon você esta procurando ?"
              ></v-autocomplete>
              <v-text-field
                v-else
                v-model="pokemon"
                label="Qual pokémon você esta procurando ?"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="12" md="12">
              <v-btn block elevation="2" class="btn" @click="buscarPokemon()"
                >Buscar</v-btn
              >
            </v-col>
            <img
              v-if="loading"
              class="c-pokeball loading"
              src="./../assets/images/pokeball.png"
            />
          </div>
        </v-col>
      </v-row>
      <v-row v-if="!loading" class="d-flex justify-center">
        <v-col
          v-for="poke in pokemons"
          :key="poke.nome"
          class="c-card-col"
          cols="12"
          sm="5"
          md="4"
          lg="4"
          xl="4"
        >
          <div
            :style="{ background: backgroundColor(poke.tipo) }"
            class="c-card"
          >
            <img :src="poke.imagem" />
            <h1>{{ poke.nome }}</h1>
            <v-expansion-panels accordion elevation="0">
              <v-expansion-panel>
                <v-expansion-panel-header>Habilidades</v-expansion-panel-header>
                <v-expansion-panel-content>
                  <ul class="c-card-list">
                    <li
                      v-for="habilidade in poke.habilidades"
                      :key="habilidade.nomeHabilidade"
                    >
                      <strong>{{
                        formatarInformacoes(habilidade.nomeHabilidade).replace(
                          '-',
                          ' '
                        )
                      }}</strong>
                      <span>{{ habilidade.pontosHabilidade }}</span>
                    </li>
                  </ul>
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
        </v-col>
      </v-row>
    </v-container>
    <v-container v-else class="c-container-erro">
      <img src="./../assets/images/pokebola-animada.gif" />
    </v-container>
  </div>
</template>

<script>
export default {
  name: 'IndexPokeApi',

  data() {
    return {
      nomesPokemons: null,
      pokemon: '',
      pokemonAtualEvolucao: '',
      pokemons: null,
      evolucoes: [],
      loadingGeral: false,
      loading: false,
    }
  },
  async mounted() {
    this.loadingGeral = true
    try {
      const nomePokemons = await this.$api.get('pokemon/?limit=6000')
      this.nomesPokemons = nomePokemons.data.results
    } catch (error) {
      this.loadingGeral = false
      return false
    } finally {
      this.loadingGeral = false
    }
  },
  methods: {
    async buscarPokemon() {
      if (this.pokemon !== '') {
        try {
          this.loading = true
          const pokemonPrincipal = await this.$api.get(
            `pokemon/${this.pokemon}`
          )

          const species = await this.$api.get(pokemonPrincipal.data.species.url)
          const evolucoes = await this.$api.get(
            species.data.evolution_chain.url
          )

          const arrayPokemons = []
          const { name, sprites, types, id } = pokemonPrincipal.data

          this.pokemonAtualEvolucao = name

          const habilidades = pokemonPrincipal.data.stats.map((item) => {
            const pontosHabilidade = item.base_stat
            const nomeHabilidade = item.stat.name
            return {
              pontosHabilidade,
              nomeHabilidade,
            }
          })
          arrayPokemons.push({
            id,
            nome: name,
            imagem: sprites.other['official-artwork'].front_default,
            habilidades,
            tipo: types[0].type.name,
          })

          this.pokemons = arrayPokemons

          this.evolucoes = evolucoes.data.chain
          await this.VerificaSeTemEvolucao(evolucoes.data.chain)
          await this.ordenando()
          this.pokemonAtualEvolucao = ''
          this.loading = false
        } catch (error) {
          this.loading = false
          switch (error.response.status) {
            case 400:
              this.loading = false
              this.$izitoast.error({
                position: 'topRight',
                duration: 10000,
                title: 'Error',
                message: `${error.response.data}`,
              })
              break
            case 401:
              this.loading = false
              this.$izitoast.error({
                position: 'topRight',
                duration: 10000,
                title: 'Error',
                message: 'Credenciais inválidas',
              })
              break
            default:
              this.loading = false
              this.$izitoast.error({
                position: 'topRight',
                duration: 10000,
                title: 'Error',
                message: 'Serviço indisponivel no momento',
              })
              break
          }

          return false
        } finally {
          this.loading = false
        }
      } else {
        this.loading = false
        this.$izitoast.warning({
          position: 'topRight',
          duration: 10000,
          title: 'Alerta',
          message: 'Digite o nome de um pokémon',
        })
      }
    },
    async VerificaSeTemEvolucao(arrayEvolucao) {
      if (arrayEvolucao.evolves_to[0] !== undefined) {
        if (
          arrayEvolucao.evolves_to[0].species.name === this.pokemonAtualEvolucao
        ) {
          await this.VerificaSeTemEvolucao(arrayEvolucao.evolves_to[0])
        } else {
          this.pokemonAtualEvolucao = arrayEvolucao.evolves_to[0].species.name
          await this.buscarEvolucao()

          await this.VerificaSeTemEvolucao(arrayEvolucao.evolves_to[0])
        }
      }
    },
    async buscarEvolucao() {
      if (this.pokemonAtualEvolucao !== '') {
        try {
          this.loading = true
          const pokemonPrincipal = await this.$api.get(
            `pokemon/${this.pokemonAtualEvolucao}`
          )

          const { name, sprites, types, id } = pokemonPrincipal.data

          const habilidades = pokemonPrincipal.data.stats.map((item) => {
            const pontosHabilidade = item.base_stat
            const nomeHabilidade = item.stat.name
            return {
              pontosHabilidade,
              nomeHabilidade,
            }
          })
          this.pokemons.push({
            id,
            nome: name,
            imagem: sprites.other['official-artwork'].front_default,
            habilidades,
            tipo: types[0].type.name,
          })
        } catch (error) {
          this.loading = false
          switch (error.response.status) {
            case 400:
              this.loading = false
              this.$izitoast.error({
                position: 'topRight',
                duration: 10000,
                title: 'Error',
                message: `${error.response.data}`,
              })
              break
            case 401:
              this.loading = false
              this.$izitoast.error({
                position: 'topRight',
                duration: 10000,
                title: 'Error',
                message: 'Credenciais inválidas',
              })
              break
            default:
              this.loading = false
              this.$izitoast.error({
                position: 'topRight',
                duration: 10000,
                title: 'Error',
                message: 'Serviço indisponivel no momento',
              })
              break
          }

          return false
        } finally {
          this.loading = false
        }
      } else {
        this.loading = false
        this.$izitoast.warning({
          position: 'topRight',
          duration: 10000,
          title: 'Alerta',
          message: 'Digite o nome de um pokémon',
        })
      }
    },
    async ordenando() {
      this.pokemons = await this.pokemons.sort((a, b) => {
        if (Number(a.id) > Number(b.id)) return 1
        if (Number(a.id) < Number(b.id)) return -1
        return 0
      })
    },
    backgroundColor(tipo) {
      switch (tipo) {
        case 'grass':
          return '#78C850'
        case 'poison':
          return '#A040A0'
        case 'fire':
          return '#F08030'
        case 'water':
          return ' #6890F0'
        case 'flying':
          return '#A890F0'
        case 'bug':
          return '#A8B820'
        case 'normal':
          return '#ece9e9'
        case 'electric':
          return '#F8D030'
        case 'psychic':
          return '#a29bfe'
        case 'dragon':
          return '#ffeaa7'
        case 'fairy':
          return '#FF0069'
        case 'fighting':
          return '#30336b'
        case 'ground':
          return '#EFB549'
        case 'ghost':
          return '#a55eea'
        case 'ice':
          return '#74b9ff'
        case 'rock':
          return '#2d3436'
        default:
          return '#ece9e9'
      }
    },
    formatarInformacoes(nomeHabilidade) {
      switch (nomeHabilidade) {
        case 'hp':
          return 'Pontos de Dano'
        case 'attack':
          return 'Ataque'
        case 'defense':
          return 'Defesa'
        case 'special-attack':
          return 'Ataque Especial'
        case 'special-defense':
          return 'Defesa Especial'
        case 'speed':
          return 'Velocidade'
      }
    },
  },
}
</script>
<style lang="scss" scoped>
* {
  font-family: Arial, Helvetica, sans-serif;
}
.c-pokeball {
  width: 60px;
}
.loading {
  animation: loading 2s linear infinite;
}
@keyframes loading {
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
}
.c-search {
  display: flex;
  width: 350px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  img {
    max-width: 300px;
  }
  transition: all ease 0.3s;
}

.btn {
  background: #2b6eb6 !important;
  color: #ffeb3b;
}
.c-card {
  border: 7px solid #ffffff9e;
  max-width: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 18px;
  transition: all ease 0.3s;
  img {
    max-width: 150px;
  }
  h1 {
    text-transform: capitalize;
  }
}
.c-card:hover {
  transform: scale(1.05);
}
.c-card-list {
  list-style: none;
  padding: 0;
  li {
    display: flex;
    justify-content: space-between;
  }
}
.c-container-erro {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
@media (min-width: 960px) {
  .container {
    max-width: 900px;
  }
}
@media (max-width: 599px) {
  .c-card-col {
    display: flex;
    justify-content: center;
  }
  .c-card {
    flex: 1;
  }
}
</style>
<style>
.theme--light.v-expansion-panels .v-expansion-panel {
  background: #ffffff75;
}
.v-expansion-panels {
  border-radius: 0px 0px 10px 10px;
}
.v-expansion-panel::before {
  box-shadow: unset !important;
}
</style>
