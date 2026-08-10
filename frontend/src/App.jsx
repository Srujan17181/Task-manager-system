import React from 'react'
import {BrowserRouter,Routes,Route} from 'react-router-dom'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Dashboard from './pages/admin/Dashboard'
import ManageTask from './pages/admin/ManageTask'
import CreateTask from './pages/admin/CreateTask'
import ManageUser from './pages/admin/ManageUser'
import PrivateRoute from './routes/PrivateRoute'

const App = () => {
  return (
    <div >
      <BrowserRouter>
      <Routes>
        <Route path='/login' element={<Login/>} />
        <Route path='/signup' element={<Signup/>} />
        
        {/* admin routes */}
        <Route element={<PrivateRoute allowedRoles={["admin"]}/>}>
        <Route  path='/admin/dashboard' element={<Dashboard/>} />
        <Route  path='/admin/task' element={<ManageTask/>} />
        <Route  path='/admin/users' element={<ManageUser/>} />
        <Route  path='/admin/Createtask' element={<CreateTask/>} />
        </Route>
      </Routes>
      </BrowserRouter>
      </div>
  )
}

export default App
