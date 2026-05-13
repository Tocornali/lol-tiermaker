export interface Champion {
  id: string
  name: string
  image: {
    full: string
  }
}

/**
 * Obtiene la versión más reciente de Data Dragon (DDragon).
 */
export async function getLatestVersion(): Promise<string> {
  try {
    console.log("RIOT_SERVICE: Solicitando versiones...")
    const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json')
    if (!response.ok) throw new Error('No se pudo obtener la lista de versiones')
    const versions: string[] = await response.json()
    console.log("RIOT_SERVICE: Versión obtenida:", versions[0])
    return versions[0]
  } catch (error) {
    console.error('RIOT_SERVICE_ERROR en getLatestVersion:', error)
    throw error
  }
}

/**
 * Obtiene el mapa de campeones para una versión específica.
 * @param version Versión de DDragon
 * @returns El objeto 'data' de Riot (Mapa ID -> Champion)
 */
export async function getChampions(version: string): Promise<Record<string, Champion>> {
  try {
    console.log(`RIOT_SERVICE: Solicitando campeones para v${version}...`)
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/es_MX/champion.json`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`No se pudo obtener la lista de campeones para la versión ${version}`)
    const data = await response.json()
    console.log("RIOT_SERVICE: Datos de campeones recibidos (mapa)")
    return data.data // Retornamos el mapa como pide el usuario
  } catch (error) {
    console.error(`RIOT_SERVICE_ERROR en getChampions:`, error)
    throw error
  }
}

/**
 * Genera la URL completa del icono cuadrado de un campeón.
 */
export function getChampionIconUrl(version: string, championId: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championId}.png`
}
