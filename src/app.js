let ZOOM = 11;

// Criar e centralizar mapa
const map = L.map("mapa").setView([-22.877222, -43.336329], ZOOM);
// Adiciona a camada de mapa, zoom máximo e atribui os direitos autorais
L.tileLayer("httpss://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

let currentPos;

// Ao carregar tudo
window.onload = async () => {
  // Solicita a posição geográfica do usuário
  const getCoords = navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    // Imprime a localização
    // console.log(typeof coords.latitude);
    L.circle([coords.latitude, coords.longitude], { radius: coords.accuracy }).addTo(map);
    currentPos = L.marker([coords.latitude, coords.longitude]).addTo(map);
    ZOOM = 15;
    map.setView([coords.latitude, coords.longitude], ZOOM);
  },
    (error) => console.warn('Falha na localização geográfica', error),
    { enableHighAccuracy: true });
  await Promise.all([getCoords]);
};

let oldLatLang; let newLatLang;
let contador = 0;
let listaMarkers = [];
let filtros = {
  linha: '',
  ordem: '',
  ident: '',
};
let horaAtual;
let rotaLinha;
let rotaResponse;
let rota;

setInterval(() => {
  filtros.linha = document.getElementById('input-linha').value;
  filtros.ordem = document.getElementById('input-ordem').value;
  filtros.ident = document.getElementById('input-ident').value;
  const date = new Date();
  horaAtual = date.getHours() * 60 * 60 + date.getMinutes() * 60 + date.getSeconds();
}, 100);

const getLastAtt = (horaOnibus) => {
  const lastAtt = (horaOnibus.getHours() * 60 * 60 + horaOnibus.getMinutes() * 60 + horaOnibus.getSeconds()) - 10800;
  const diff = horaAtual - lastAtt;
  if (diff >= 60) {
    const min = Math.floor(diff / 60);
    let sec = diff % 60;
    if (sec < 10) sec = `0${sec}`;
    return `${min}:${sec}m`;
  }
  return `${diff}s`;
};

const saveFile = async (data) => {
  try {
    await fetch('https://cademeuonibus.com/save-data', {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.warn(error);
  }
  contador += 1;
  console.log('Arquivo salvo -> ', contador);
  if (contador >= 20) {
    contador = 0;
    window.location.reload();
  }
  // console.log('Fingiu que salvou');
};

const loadTrue = (msg) => {
  document.getElementById('loading').style.visibility = "visible";
  document.getElementById('loading').innerText = msg;
  document.getElementsByClassName('spinner')[0].style.visibility = "visible";
}
const loadFalse = () => {
  document.getElementById('loading').style.visibility = "collapse";
  document.getElementsByClassName('spinner')[0].style.visibility = "collapse";
}

while (true) {
  console.log('Iniciando requisições');
  if (currentPos !== undefined) {
    let cont = 0;
    map.eachLayer(async (lay) => {
      cont += 1;
      if (cont === 4 && Object.keys(lay).includes('_popup') === false) {
        loadTrue('User location')
        try {
          let posMapa = await fetch('https://cademeuonibus.com/user-location', {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([currentPos._latlng.lat, currentPos._latlng.lng])
          });
          posMapa = await posMapa.json();
          lay.bindPopup(`<div><b>Endereço atual:</b><br>${posMapa.results[0].formatted_address}</div>`);
        } catch (error) { console.warn(error); }
        loadFalse();
      }
    });
  }
  loadTrue('Atualizando posições')
  const responseBus = await fetch('https://cademeuonibus.com/api/bus');
  const responseBrt = await fetch('https://cademeuonibus.com/api/brt');
  loadFalse();
  let reqBus = await responseBus.json();
  let reqBrt = await responseBrt.json();

  let cont = 0;
  map.eachLayer((layer) => { cont += 1; cont >= 5 && map.removeLayer(layer); });

  if (filtros.linha.length > 0) {
    reqBus = reqBus.filter(({ linha }) => linha === filtros.linha);
    reqBrt = reqBrt.filter(({ linha }) => linha === filtros.linha);
  }
  if (filtros.ordem.length > 0) {
    reqBrt = [];
    reqBus = reqBus.filter(({ ordem }) => ordem === filtros.ordem);
  }
  if (filtros.ident.length > 0) {
    reqBus = [];
    reqBrt = reqBrt.filter(({ vei_nro_gestor }) => vei_nro_gestor === filtros.ident);
  }

  // const reqBus = await response.json();
  if (reqBus !== undefined) {
    reqBus.sort((a, b) => a.ordem.localeCompare(b.ordem));
    // console.log(reqBus);

    // oldLatLang = newLatLang;
    // newLatLang = reqBus.map(bus => [bus.latitude, bus.longitude]);

    reqBus.forEach(onibus => {
      const date = new Date(onibus.dataHora);

      // const teste = new Date((lastAtt.getTime() - horaAtual.getTime())/1000);
      const mark = {
        ordem: onibus.ordem,
        latLng: [onibus.latitude, onibus.longitude],
        marker: L.marker([onibus.latitude, onibus.longitude], {
          icon: new L.DivIcon({
            className: 'bus-icon',
            html: `<div class-name="bus-icon" style="display: flex; justify-content: center; align-items: center; background-color: #2d77a6; border-radius: 50%; width: 20px; height: 20px;"><span style="font-size: 9px; display: flex; justify-content: center; align-items: center;"><font color="white">${onibus.linha}</font></span></div>`,
          })
        })
      }
      mark.marker.bindPopup(`<div><b>Linha: </b>${onibus.linha}<br><b>Velocidade: </b>${onibus.velocidade}km/h<br><b>Ordem: </b>${onibus.ordem}<br><b>Última atualização: </b>${getLastAtt(date)}</div>`).openPopup();
      map.addLayer(mark.marker);
    });

    // let hasMoved = false;
    // if (oldLatLang !== undefined) {
    //   await newLatLang.find((bus, index) => {
    //     try { if(oldLatLang[index][0] !== bus[0] || oldLatLang[index][1] !== bus[1]) return hasMoved = true;
    //     } catch (error) { console.warn(error); }
    //   });
    // }
    // if (hasMoved === true) {
    //   const lista = reqBus.map(bus => [bus.linha, bus.latitude, bus.longitude]);
    //   await saveFile(lista);
    // }
  }

  if (reqBrt !== undefined) {
    // reqBrt.sort((a, b) => a.vei_nro_gestor.localeCompare(b.vei_nro_gestor));
    reqBrt.sort((a, b) => a.vei_nro_gestor < b.vei_nro_gestor ? -1 : a.vei_nro_gestor > b.vei_nro_gestor ? 1 : 0);
    // console.log(reqBrt);

    reqBrt.forEach(brt => {
      const date = new Date(brt.inicio_viagem);
      const horaBrt = `${date.getHours()}:${date.getMinutes()}`;

      // const teste = new Date((lastAtt.getTime() - horaAtual.getTime())/1000);
      const mark = {
        ident: brt.vei_nro_gestor,
        latLng: [brt.latitude, brt.longitude],
        marker: L.marker([brt.latitude, brt.longitude], {
          icon: new L.DivIcon({
            className: 'brt-icon',
            html: `<div class-name="brt-icon" style="display: flex; justify-content: center; align-items: center; background-color: #336600; border-radius: 50%; width: 20px; height: 20px;"><span style="font-size: 9px; display: flex; justify-content: center; align-items: center;"><font color="white">${brt.linha}</font></span></div>`,
          })
        })
      }
      mark.marker.bindPopup(`<div><b>Linha: </b>${brt.linha}<br><b>Velocidade: </b>${brt.velocidade}km/h<br><b>Identificador: </b>${brt.vei_nro_gestor}<br><b>Iniciou a viagem às </b>${horaBrt}</div>`).openPopup();
      map.addLayer(mark.marker);
      // listaMarkers.push(mark);
    });

    // if (filtros.linha.length > 0 || filtros.ordem.length > 0 || filtros.ident.length > 0) {
    //   if (filtros.linha.length > 0) rotaLinha = filtros.linha;
    //   if (filtros.ordem.length > 0) {
    //     const aux = reqBus.find(({ ordem }) => ordem === filtros.ordem);
    //     rotaLinha = aux.linha;
    //   }

    //   if (rotaResponse === undefined) {
    //     rotaResponse = await fetch(`https://cademeuonibus.com/rotas/${rotaLinha}`);
    //     console.log(rotaResponse);
    //     let aux;
    //     try {
    //       aux = await rotaResponse.json();
    //     } catch (error) {
    //       console.log(error);
    //     }
    //     let aux2 = [];
    //     for (let i = 0; i < aux.length; i++) {
    //       if (aux[i][0].length >= 10) {
    //         const coords = aux[i][0].split(',');
    //         aux2.push([Number(coords[0]), Number(coords[1])]);
    //       }
    //       // else console.warn(i, aux[i]);
    //       else console.warn(i, aux[i], aux[i][0].length);
    //       // if(aux[i] === '0' || aux[i] === undefined) console.warn(i, aux[i]);
    //     }
    //     aux2.sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
    //     aux2 = aux2.slice(0, 10);
    //     // console.log('aux2', aux2);

    //     function haversine(lat1, lon1, lat2, lon2){
    //       // distance between latitudes and longitudes
    //       let dLat = (lat2 - lat1) * Math.PI / 180.0;
    //       let dLon = (lon2 - lon1) * Math.PI / 180.0;
            
    //       // convert to radiansa
    //       lat1 = (lat1) * Math.PI / 180.0;
    //       lat2 = (lat2) * Math.PI / 180.0;
          
    //       // apply formulae
    //       let a = Math.pow(Math.sin(dLat / 2), 2) +
    //               Math.pow(Math.sin(dLon / 2), 2) *
    //               Math.cos(lat1) *
    //               Math.cos(lat2);
    //       let rad = 6371;
    //       let c = 2 * Math.asin(Math.sqrt(a));
    //       return rad * c;
    //     }

    //     let aux3 = [];

    //     for (let i = 0; i < aux2.length; i += 1) {
    //       // 4
    //       // console.log(i, aux2[i]);
    //       let toPush;
    //       if (i + 1 === aux2.length) break;
    //       if (i === 0) toPush = aux2[i];
    //       if (toPush === undefined) {
    //         for (let j = i + 1; j < aux2.length; j += 1) {
    //           // 5
    //           // const arraySliced = aux2.slice(j);
    //           // array[5...final]
    //           // console.log(aux2);
    //           // console.log(arraySliced);
    //           const arrayDistance = aux2.slice(j).map((coord, index) => {
    //             return {
    //               index: (index + j) - 1,
    //               distance: haversine(aux2[i][0], aux2[i][1], coord[0], coord[1]),
    //             };
    //           });
    //           // array[{index: 5, distance: 5m}, {index: 6, distance: 2m}, {index: 7, distance: 10m}]
    //           arrayDistance.sort((a, b) => a.distance < b.distance ? -1 : a.distance > b.distance ? 1 : 0);
    //           // console.log('arrayDistance', arrayDistance);
    //           // const { index } = arrayDistance[0];
    //           toPush = aux2[arrayDistance[0].index];
    //           // console.log(toPush);
    //         }
    //         aux3.push(toPush);
    //       }
    //     }

    //     // aux3 = [...new Set(aux3)];
    //     // console.log('aux3', aux3);
    //     // for (let i = 0; i < aux2.length; i += 1) {
    //     //   if (i+1 === aux2.length) break;
    //     //   const atual = aux2[i]; const depois = aux2[i+1];
    //     //   let diff = haversine(atual[0], atual[1], depois[0], depois[1]);
    //     //   let toPush;
    //     //   for (let j = (i + 2); j < aux2.length; j += 1) {
    //     //     if (j === aux2.length) break; 
    //     //     if (aux2[j] !== atual) {
    //     //       const aux = haversine(atual[0], atual[1], aux2[j][0], aux2[j][1]);
    //     //       if (aux > diff) toPush = aux2[j];
    //     //     }
    //     //   }
    //     //   if (toPush !== undefined) aux3.push(toPush);
    //     // }

    //     setTimeout(() => console.log('pausa'), 60000);

    //     // cont = 0;
    //     // aux3.forEach(bus => {
    //     //   cont += 1;
    //     //   if(cont <= 100) console.warn(bus);
    //     // });

    //     rota = new L.Polyline(aux3, {
    //       color: 'red',
    //       weight: 2,
    //       opacity: 0.5,
    //       smoothFactor: 1
    //     });
    //     map.addLayer(rota);
    //     rotaResponse = undefined;
    //   }
    // }
    // if (filtros.linha.length === 0 && filtros.ordem.length === 0 && filtros.ident.length === 0) rotaLinha = undefined;
  }
  // console.log('Requisição concluída');
};