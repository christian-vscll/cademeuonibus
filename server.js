const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const {rotas} = require("./rotas.txt");

const app = express();
app.use(express.static(__dirname + '/src'));
app.use(bodyParser.json({limit: '50mb'}));
// app.use(express.bodyParser({limit: '50mb'}));
app.use(cors());
app.use(express.static('src'));

let contador = 0;

app.listen(3001, () => console.log('Server online'));

const fetchBus = async () => {
  const URL = 'http://jeap.rio.rj.gov.br/dadosAbertosAPI/v2/transporte/veiculos/onibus2/';

  const response = await fetch(URL, {
    method: 'GET',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
  
  return response.json();
};

const fetchBrt = async () => {
  const URL = 'https://jeap.rio.rj.gov.br/dadosAbertosAPI/v2/transporte/veiculos/brt/';

  const response = await fetch(URL, {
    method: 'GET',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
    
  return response.json();
};

const fetchUserLocation = async (coords) => {
  // Google api key AIzaSyC9y89nHKY4qodOsMcq1FZ8jSURVDbwEYk
  const URL = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords[0]},${coords[1]}&sensor=false&key=AIzaSyC9y89nHKY4qodOsMcq1FZ8jSURVDbwEYk`;

  const response = await fetch(URL, {
    method: 'GET',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
  
  await Promise.all([response]);
  const toReturn = await response.json();
  return toReturn;
};

app.get('/api/bus', async (_req, res) => {
  try {
    response = await fetchBus();
    return res.send(response);
  } catch (error) { console.warn(error); }
});

app.get('/api/brt', async (_req, res) => {
  try {
    response = await fetchBrt();
    return res.send(response);
  } catch (error) { console.warn(error); }
});

app.post('/user-location', async (req, res) => {
  try {
    response = await fetchUserLocation(req.body);
    return res.send(response);
  } catch (error) { console.warn(error); }
});

// app.post('/save-data', async (req, res) => {
//   const lista = req.body;
//   await lista.forEach(async (bus) => {
//     const imprimir = `${bus[0]};${bus[1]};${bus[2]}\n`;
//     await fs.appendFile("/home/chris/Nova pasta/teste.txt", imprimir, function(erro) {
//       if(erro) throw erro;
//     }); 
//   });
//   contador += 1;
//   console.log('Arquivo salvo -> ', contador);
//   return res.status(200).end()
// });

// app.get('/teste', async (_req, res) => {
//   // const file = fs.readFileSync("/home/chris/Nova pasta/teste.txt", 'utf-8', function(erro) {
//   console.log('Splitando arquivo');
//   const file = fs.readFileSync("C:\\Users\\chris\\Desktop\\Cade meu onibus\\teste.txt", 'utf-8', function(erro) {
//     if(erro) throw erro;
//   }).split('\n');
//   console.log('Achou e splitou');

//   let paths = {};
//   let cont = 0;
//   for (const linha of file) {
//     cont += 1;
//     console.log(cont);
//     const splitedLine = linha.split(';');
//     const linhaBus = splitedLine[0];
//     const coordsBus = [`${splitedLine[1]}, ${splitedLine[2]}`];

//     if (Object.keys(paths).includes(linhaBus) === false) paths[linhaBus] = [coordsBus];
//     if (Object.keys(paths).includes(linhaBus) === true){
//       const aux = paths[linhaBus]; aux.push(coordsBus); paths[linhaBus] = aux;
//     }
//   }
  
//   fs.writeFileSync("C:\\Users\\chris\\Desktop\\Cade meu onibus\\rotas.txt", JSON.stringify(paths), function(erro) {
//     if(erro) throw erro;
//   }); 
//   console.log('Terminou');
//   res.end();
// });

// app.get('/rotas', (_req, res) => res.send(rotas));
// app.get('/rotas/:linha', (req, res) => res.send(rotas[req.params.linha]));