import React from 'react'
import {BrowserRouter,Routes,Route} from 'react-router-dom'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Dashboard from './pages/admin/Dashboard'
import ManageTask from './pages/admin/ManageTask'
import CreateTask from './pages/admin/CreateTask'
import ManageUser from './pages/admin/ManageUser'
import PrivateRoute from './routes/PrivateRoute'
import UserDashboard from './pages/users/UserDashboard'
import MyTasks from './pages/users/MyTasks'
import TaskDetails from './pages/users/TaskDetails'

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
        <Route  path='/admin/tasks' element={<ManageTask/>} />
        <Route  path='/admin/users' element={<ManageUser/>} />
        <Route  path='/admin/Createtask' element={<CreateTask/>} />
        </Route>

        {/* user routes */}
        <Route element={<PrivateRoute allowedRoles={["user"]}/>}>
        <Route path='/user/dashboard' element={<UserDashboard/>} />
        <Route path='/user/tasks' element={<MyTasks/>} />
        <Route path='/user/task-details/:id' element={<TaskDetailsils/>} />


        </Route>
      </Routes>
      </BrowserRouter>
      </div>
  )
}

export default App
