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
  if (resp) {
    res.json({ hotel: newHotel, success: true, message: 'Hotel creado satisfactoriamente' });
  }
  else {
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

jsonServerApp.patch('/hotels/:id/rooms', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = req.body;
  const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
  const hotel = hotels.find((hotel) => hotel.id === id);
  if (hotel) {
    if (data.rooms.length > 0) {
      hotel.available_rooms = hotel.available_rooms.map(room_available => {
        return {
          ...room_available,
          used: false
        };
      })
      let rooms_for_add = hotel.available_rooms.filter(room => data.rooms.includes(room.id) && !room.used);
      rooms_for_add = rooms_for_add.map(room => {
        const { used, ...rest } = room;
        return rest;
      });
      hotel.rooms = rooms_for_add
      hotel.available_rooms = hotel.available_rooms.map(room_available => {
        // Verificar si la habitación está en rooms_for_add, actualizar su estado
        if (rooms_for_add.some(room => room.id === room_available.id)) {
          return {
            ...room_available,
            used: true
          };
        } else {
          return room_available;
        }
      });
    }
    else {
      hotel.rooms = []
    }
    jsonServerRouter.db.set('hotels', hotels).write();
    res.json({ success: true, message: `${data.rooms.length > 0 ? 'Habitaciones' : 'Habitación'} del hotel ${data.rooms.length > 0 ? 'modificadas' : 'modificada'} correctamente` });
  } else {
    res.status(404).json({ success: false, message: 'Hotel no encontrado' });
  }
});

//End hotels apis

//Rooms apis

jsonServerApp.get('/hotels/:hotelId/available-rooms/:roomId', (req, res) => {
  const hotelId = parseInt(req.params.hotelId, 10);
  const roomId = parseInt(req.params.roomId, 10);

  const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
  const hotel = hotels.find((hotel) => hotel.id === hotelId);

  if (hotel) {
    // Find the room in available_rooms
    const room = hotel.available_rooms.find((room) => room.id === roomId);
    if (room) {
      room.hotel = {
        id: hotel.id,
        name: hotel.name,
      };
      res.json({ success: true, room });
    } else {
      res.status(404).json({ success: false, message: 'Habitación no encontrada' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Hotel no encontrado' });
  }
});

jsonServerApp.patch('/hotels/:hotelId/available-rooms/:roomId/status', (req, res) => {
  const hotelId = parseInt(req.params.hotelId, 10);
  const roomId = parseInt(req.params.roomId, 10);
  const newStatus = req.body.status;

  const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
  const hotel = hotels.find((hotel) => hotel.id === hotelId);

  if (hotel) {
    const rooms_available = hotel.available_rooms.find((room) => room.id === roomId);
    const rooms = hotel.rooms.find((room) => room.id === roomId);
    if (rooms && rooms_available) {
      rooms_available.status = newStatus;
      rooms.status = newStatus;
      jsonServerRouter.db.set('hotels', hotels).write();
      res.json({ success: true, message: 'Estado de la habitación actualizado satisfactoriamente' });
    } else {
      res.status(404).json({ success: false, message: 'Habitación no encontrada' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Hotel no encontrado' });
  }
});

jsonServerApp.patch('/hotels/:hotelId/available-rooms/:roomId', (req, res) => {
  const hotelId = parseInt(req.params.hotelId, 10);
  const roomId = parseInt(req.params.roomId, 10);
  const updatedRoomData = req.body; // Assuming the request body contains the updated room data

  const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
  const hotel = hotels.find((hotel) => hotel.id === hotelId);

  if (hotel) {
    const roomIndex = hotel.rooms.findIndex((room) => room.id === roomId);
    const roomAvailableIndex = hotel.available_rooms.findIndex((room) => room.id === roomId);
    if (roomIndex !== -1 && roomAvailableIndex !== -1) {
      hotel.rooms[roomIndex] = { ...hotel.rooms[roomIndex], ...updatedRoomData };
      hotel.available_rooms[roomAvailableIndex] = { ...hotel.available_rooms[roomAvailableIndex], ...updatedRoomData };
      jsonServerRouter.db.set('hotels', hotels).write();
      res.json({ success: true, message: 'Habitación actualizada satisfactoriamente' });
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
    newAvailableRoom.used = false
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
    const index_room = hotel.rooms.findIndex((room) => room.id === roomId);
    const index_available_room = hotel.available_rooms.findIndex((room) => room.id === roomId);

    if (index_room !== -1 && index_available_room !== -1) {
      hotel.rooms.splice(index_room, 1);
      hotel.available_rooms.splice(index_available_room, 1);
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