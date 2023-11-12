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
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

jsonServerApp.get('/users', (req, res) => {
  res.json(jsonServerRouter.db.get('users'));
});

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
    res.status(404).json({ success: false, message: 'Hotel not found' });
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
    // Respond with a success message
    res.json({ success: true, message: 'Hotel data updated successfully' });
  } else {
    // If the hotel with the specified id is not found, respond with a 404 status
    res.status(404).json({ success: false, message: 'Hotel not found' });
  }
});

jsonServerApp.post('/hotels', (req, res) => {
  console.log(req.body)
  const newHotel = req.body;
  const hotels = _.cloneDeep(jsonServerRouter.db.get('hotels').value());
  newHotel.id = hotels.length + 1; // Assign a new id to the hotel
  newHotel.rooms = []; // Assign empty rooms to the new hotel
  newHotel.available_rooms = []; // Assign a default available rooms to the hotel
  newHotel.status = true; // Assign a default available status to the hotel
  hotels.push(newHotel);
  const resp = jsonServerRouter.db.set('hotels', hotels).write();
  if(resp){
    res.json({ hotel: newHotel,success: true, message: 'Hotel created successfully' });
  }
  else{
    res.status(404).json({ success: false, message: 'Hotel creation failed' });
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
    // Respond with a success message
    res.json({ success: true, message: 'Hotel status updated successfully' });
  } else {
    // If the hotel with the specified id is not found, respond with a 404 status
    res.status(404).json({ success: false, message: 'Hotel not found' });
  }
});

// Use cors middleware
app.use(cors());

app.use('/api', jsonServerApp);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});