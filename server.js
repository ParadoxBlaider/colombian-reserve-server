const express = require('express');
const cors = require('cors');
const jsonServer = require('json-server');
const path = require('path');

const app = express();
const jsonServerApp = jsonServer.create();
const jsonServerRouter = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const _ = require('lodash');

// Use express.json() middleware to parse JSON in the request body
app.use(express.json());

jsonServerApp.use(jsonServer.bodyParser);
jsonServerApp.use(middlewares);

jsonServerApp.post('/authenticate', (req, res) => {
  const { username, password } = req.body;
  const user = jsonServerRouter.db.get('users').find({ username, password }).value();

  if (user) {
    res.json({ username: user.username, token: user.token });
  } else {
    res.status(401).json({ error: 'Credenciales invalidas' });
  }
});

jsonServerApp.get('/users', (req, res) => {
  res.json(jsonServerRouter.db.get('users'));
});

//Hotels apis

jsonServerApp.get('/hotels', (req, res) => {
  res.json(jsonServerRouter.db.get('hotels'));
});

jsonServerApp.get('/hotels/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const hotels = jsonServerRouter.db.get('hotels').value();
  const hotel = hotels.find((hotel) => hotel.id === id);
  if (hotel) {
    res.json(hotel);
  } else {
    res.status(404).json({ success: false, message: 'Hoteles no encontrados' });
  }
});

jsonServerApp.patch('/hotels/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = req.body;
  const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
  const hotel = hotels.find((hotel) => hotel.id === id);
  if (hotel) {
    hotel.name = data.name;
    hotel.address = data.address;
    hotel.city = data.city;
    jsonServerRouter.db.set('hotels', hotels).write();
    res.json({ success: true, message: 'Hotel actualizado correctamente' });
  } else {
    res.status(404).json({ success: false, message: 'Hotel no encontrado' });
  }
});

jsonServerApp.post('/hotels', (req, res) => {
  const newHotel = req.body;
  const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
  newHotel.id = hotels.length + 1;
  newHotel.rooms = [];
  newHotel.available_rooms = [];
  newHotel.status = true;
  hotels.push(newHotel);
  const resp = jsonServerRouter.db.set('hotels', hotels).write();
  if(resp){
    res.json({ hotel: newHotel,success: true, message: 'Hotel creado satisfactoriamente' });
  }
  else{
    res.status(404).json({ success: false, message: 'Hubo un error al crear el hotel' });
  }
});

jsonServerApp.patch('/hotels/:id/status', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const newStatus = req.body.status;
  const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
  const hotel = hotels.find((hotel) => hotel.id === id);
  if (hotel) {
    hotel.status = newStatus;
    jsonServerRouter.db.set('hotels', hotels).write();
    res.json({ success: true, message: 'Estado del hotel actualizado satisfactoriamente' });
  } else {
    res.status(404).json({ success: false, message: 'Hotel no encontrado' });
  }
});

jsonServerApp.delete('/hotels/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
  const index = hotels.findIndex((hotel) => hotel.id === id);

  if (index !== -1) {
    hotels.splice(index, 1);
    jsonServerRouter.db.set('hotels', hotels).write();
    res.json({ success: true, message: 'Hotel borrado satisfactoriamente' });
  } else {
    res.status(404).json({ success: false, message: 'Hotel no encontrado' });
  }
});

//End hotels apis

//Rooms apis

jsonServerApp.patch('/hotels/:hotelId/available-rooms/:roomId/status', (req, res) => {
  const hotelId = parseInt(req.params.hotelId, 10);
  const roomId = parseInt(req.params.roomId, 10);
  const newStatus = req.body.status;

  const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
  const hotel = hotels.find((hotel) => hotel.id === hotelId);

  if (hotel) {
    const room = hotel.available_rooms.find((room) => room.id === roomId);
    if (room) {
      room.status = newStatus;

      jsonServerRouter.db.set('hotels', hotels).write();
      res.json({ success: true, message: 'Estado de la habitación actualizado satisfactoriamente' });
    } else {
      res.status(404).json({ success: false, message: 'Habitación no encontrada' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Hotel no encontrado' });
  }
});

jsonServerApp.post('/hotels/:id/available-rooms', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const newAvailableRoom = req.body;
  const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
  const hotel = hotels.find((hotel) => hotel.id === id);

  if (hotel) {
    // Asigna un nuevo id a la habitación disponible
    newAvailableRoom.id = hotel.available_rooms.length + 1;
    newAvailableRoom.status = true
    hotel.available_rooms.push(newAvailableRoom);

    jsonServerRouter.db.set('hotels', hotels).write();
    res.json({ success: true, message: 'Habitación agregada satisfactoriamente' });
  } else {
    res.status(404).json({ success: false, message: 'Hotel no encontrado' });
  }
});


jsonServerApp.delete('/hotels/:hotelId/available-rooms/:roomId', (req, res) => {
  const hotelId = parseInt(req.params.hotelId, 10);
  const roomId = parseInt(req.params.roomId, 10);

  const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
  const hotel = hotels.find((hotel) => hotel.id === hotelId);

  if (hotel) {
    const index = hotel.available_rooms.findIndex((room) => room.id === roomId);

    if (index !== -1) {
      hotel.available_rooms.splice(index, 1);

      jsonServerRouter.db.set('hotels', hotels).write();
      res.json({ success: true, message: 'Habitación borrada satisfactoriamente' });
    } else {
      res.status(404).json({ success: false, message: 'Habitación no encontrada' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Hotel no encontrado' });
  }
});

//End rooms apis


// Use cors middleware
app.use(cors());

app.use('/api', jsonServerApp);

//prod
// const PORT = process.env.PORT || 3000;
//develop
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});