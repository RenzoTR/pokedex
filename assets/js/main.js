function convertPokemonTypesToLi(pokemonTypes){
    return pokemonTypes.map((typeSlot) => `<li class="type">${typeSlot.type.name.charAt(0).toUpperCase() + typeSlot.type.name.slice(1)}</li>`)
}



function convertPokemonToLi(pokemon){
        return `
            <li class="pokemon">
                <span class="number">#0${pokemon.order}</span>
                <span class="name">${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</span>
                    
                <div class="detail">
                    <ol class="types">
                        ${convertPokemonTypesToLi(pokemon.types).join('')}
                    </ol>

                    <img src="${pokemon.sprites.other.dream_world.front_default}" alt="${pokemon.name}">

                </div>

                    
            </li>
        `
}

const pokemonList = document.getElementById('pokemonList')


pokeApi.getPokemons().then((pokemons = []) => {    

    pokemonList.innerHTML += pokemons.map(convertPokemonToLi).join('')

})


