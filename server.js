const express = require('express');
const cors = require('cors');
const jsonServer = require('json-server');
const path = require('path');
const sgMail = require('@sendgrid/mail');

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
  newHotel.id = hotels.length > 0 ? hotels[hotels.length - 1].id + 1 : hotels.length + 1;
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
      rooms.dates_reservations = rooms.dates_reservations
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
    if (roomIndex !== -1 || roomAvailableIndex !== -1) {
      if(roomIndex !== -1){
        hotel.rooms[roomIndex] = { ...hotel.rooms[roomIndex], ...updatedRoomData };
      }
      if(roomAvailableIndex !== -1){
        hotel.available_rooms[roomAvailableIndex] = { ...hotel.available_rooms[roomAvailableIndex], ...updatedRoomData };
      }
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
    newAvailableRoom.id = hotel.available_rooms.length > 0 ? hotel.available_rooms[hotel.available_rooms.length - 1].id + 1 : hotel.available_rooms.length + 1;
    newAvailableRoom.status = true
    newAvailableRoom.used = false
    newAvailableRoom.dates_reservations = [];
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

//Bookings apis
jsonServerApp.get('/bookings', (req, res) => {
  const bookings = _.cloneDeep(jsonServerRouter.db.get('bookings').value());
  const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
  const bookingsWithHotelInfo = bookings.map((booking) => {
    const hotel = hotels.find((hotel) => hotel.id === booking.hotel_id);
    if (hotel) {
      const room = hotel.rooms.find((room) => room.id === booking.room_id);
      return {
        ...booking,
        hotel: hotel, // Agrega la información del hotel a cada reserva
        room: room
      };
    } else {
      // Manejar el caso donde no se encuentra el hotel
      return booking;
    }
  });
  if (bookings) {
    res.json({ success: true, bookings: bookingsWithHotelInfo });
  }
  else {
    res.status(404).json({ success: false, message: 'Reserva no encontrada' });
  }
  /* res.json(jsonServerRouter.db.get('bookings')); */
});
jsonServerApp.get('/bookings/:bookingId', (req, res) => {
  const id = parseInt(req.params.bookingId, 10);
  const bookings = _.cloneDeep(jsonServerRouter.db.get('bookings').value());
  if (bookings) {
    const booking = bookings.find((booking) => booking.id === id);
    const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
    const hotel = hotels.find((hotel) => hotel.id === booking.hotel_id);
    if (hotel) {
      booking.hotel = hotel
      const room = hotel.rooms.find((room) => room.id === booking.room_id);
      if (room) {
        booking.room = room
      }
    }
    res.json({ success: true, booking: booking });
  }
  else {
    res.status(404).json({ success: false, message: 'Reserva no encontrada' });
  }
  /* res.json(jsonServerRouter.db.get('bookings')); */
});

//End bookings apis

//End bookings page apis

jsonServerApp.get('/hotels_banners', (req, res) => {
  res.json(jsonServerRouter.db.get('hotels_banners'));
});

jsonServerApp.get('/hotels-web', (req, res) => {
  const hotelsWithFilteredRooms = jsonServerRouter.db
    .get('hotels')
    .filter((hotel) => hotel.status === true)
    .map((hotel) => ({
      ...hotel,
      rooms: hotel.rooms.filter((room) => room.status === true),
      available_rooms: hotel.available_rooms.filter((room) => room.status === true),
    }));

  res.json(hotelsWithFilteredRooms);
});

jsonServerApp.get('/cities', (req, res) => {
  res.json(jsonServerRouter.db.get('cities'));
});

jsonServerApp.post('/hotels_filtered', (req, res) => {
  const { city, check_in, check_out, quantity_people } = req.body;
  if (!city && !check_in && !check_out) {
    return res.json(jsonServerRouter.db.get('hotels'));
  }
  if (!city || !check_in || !check_out) {
    return res.status(400).json({ success: false, message: 'Faltan campos para completar la busqueda' });
  }
  const quantityPeople = quantity_people || 1;
  const filteredHotels = jsonServerRouter.db.get('hotels').filter((hotel) => {
    return (
      hotel.city === city &&
      hotel.status === true &&
      hotel.available_rooms.some((room) =>
        room.max_people >= quantityPeople
        /*   !room.dates_reservations.some((reservation) =>
            isOverlap(check_in, check_out, reservation.check_in, reservation.check_out)
          ) */
      )
    );
  });
  const resultWithActiveRooms = filteredHotels.map((hotel) => {
    const activeRooms = hotel.rooms.filter((room) => room.status === true);
    return { ...hotel, rooms: activeRooms };
  });
  res.json(resultWithActiveRooms);
});

/* function isOverlap(start1, end1, start2, end2) {
  return !(new Date(start1) >= new Date(end2) || new Date(end1) <= new Date(start2));
} */


jsonServerApp.post('/reservation', async (req, res) => {
  const { hotel_id, check_in, check_out, room_id, quantity_people, guests, emergency_contact } = req.body;
  /* , check_out_date, */
  if (!hotel_id || !room_id || !quantity_people || !guests) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos' });
  }

  const bookings = _.cloneDeep(jsonServerRouter.db.get('bookings').value());

  // Aquí puedes agregar la lógica para guardar la reserva en tu base de datos
  const newBooking = {
    id: bookings.length + 1, // Puedes utilizar una función para generar IDs únicos
    hotel_id,
    room_id,
    check_in_date:check_in,
    check_out_date:check_out,
    quantity_people,
    guests,
    emergency_contact
  };
  // Agrega la nueva reserva a tu lista de reservas
  bookings.push(newBooking);
  const resp = jsonServerRouter.db.set('bookings', bookings).write();
  if (resp) {

    sgMail.setApiKey('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');

    const msg = {
      to: guests[0].email,
      from: 'maacevedog2010@gmail.com',
      subject: 'Reserva realizada',
      text: 'Reserva realizada satisfactoriamente en nuestra plataforma'
    };

    sgMail.send(msg)
      .then(() => console.log('Correo enviado con éxito'))
      .catch(error => console.error('Error al enviar el correo:', error.response ? error.response.body : error));
    // Envía el correo electrónico

    res.json({ success: true, message: 'Reserva creada con éxito' });
  }
  else {
    res.status(404).json({ success: false, message: 'Hubo un error al crear la reserva' });
  }
});


//End bookings page apis




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