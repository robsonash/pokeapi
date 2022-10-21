export default function ({ $axios }, inject) {
  const api = $axios.create({
    baseURL: 'https://pokeapi.co/api/v2/',
  })

  inject('api', api)
}
