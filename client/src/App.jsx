import axios from 'axios';
import Register from './RegisterAndLogin';
import Routingpage from './Routingpage'
import Test from './Test'
import UserContextProvider from './UserContext';
function App() {
  axios.defaults.baseURL = 'http://localhost:4040'
  axios.defaults.withCredentials = true;
  return (
    <UserContextProvider>
      <Routingpage/>
      </UserContextProvider>
  )
}

export default App


