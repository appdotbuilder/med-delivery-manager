
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { User, Patient, Order, CreatePatientInput, CreateOrderInput, UpdateOrderStatusInput, OrderStatus } from '../../server/src/schema';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

function App() {
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // Patient form state
  const [patientForm, setPatientForm] = useState<CreatePatientInput>({
    name: '',
    address: '',
    date_of_birth: '',
    queue_number: '',
    attending_doctor: '',
    phone: null,
    latitude: null,
    longitude: null
  });

  // Order form state
  const [orderForm, setOrderForm] = useState<CreateOrderInput>({
    patient_id: 0,
    medication_details: '',
    created_by: 0
  });

  // Status colors
  const getStatusColor = (status: OrderStatus): string => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      obat_siap: 'bg-blue-100 text-blue-800',
      assigned_courier: 'bg-purple-100 text-purple-800',
      in_transit: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Load data based on user role
  const loadData = useCallback(async () => {
    if (!auth.user) return;

    try {
      setIsLoading(true);
      
      // Load patients for admin and hospital staff
      if (auth.user.role === 'admin' || auth.user.role === 'hospital_staff') {
        const patientsResult = await trpc.getPatients.query();
        setPatients(patientsResult);
      }

      // Load couriers for admin
      if (auth.user.role === 'admin') {
        const couriersResult = await trpc.getCouriers.query();
        setCouriers(couriersResult);
      }

      // Load orders based on role
      const ordersResult = await trpc.getUserOrders.query({
        user_id: auth.user.id,
        role: auth.user.role
      });
      setOrders(ordersResult);

    } catch (error) {
      setError('Failed to load data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [auth.user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      const result = await trpc.login.mutate(loginForm);
      setAuth({ user: result, isAuthenticated: true });
      setLoginForm({ email: '', password: '' });
    } catch (error) {
      setError('Login failed. Please check your credentials.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setAuth({ user: null, isAuthenticated: false });
    setPatients([]);
    setOrders([]);
    setCouriers([]);
    setError(null);
  };

  // Create patient handler
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const result = await trpc.createPatient.mutate(patientForm);
      setPatients((prev: Patient[]) => [...prev, result]);
      setPatientForm({
        name: '',
        address: '',
        date_of_birth: '',
        queue_number: '',
        attending_doctor: '',
        phone: null,
        latitude: null,
        longitude: null
      });
    } catch (error) {
      setError('Failed to create patient');
      console.error('Create patient error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create order handler
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.user) return;

    try {
      setIsLoading(true);
      const orderData = { ...orderForm, created_by: auth.user.id };
      const result = await trpc.createOrder.mutate(orderData);
      setOrders((prev: Order[]) => [...prev, result]);
      setOrderForm({
        patient_id: 0,
        medication_details: '',
        created_by: 0
      });
    } catch (error) {
      setError('Failed to create order');
      console.error('Create order error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update order status handler
  const handleUpdateOrderStatus = async (orderId: number, newStatus: OrderStatus, courierId?: number) => {
    if (!auth.user) return;

    try {
      setIsLoading(true);
      const updateData: UpdateOrderStatusInput = {
        order_id: orderId,
        status: newStatus,
        updated_by: auth.user.id,
        assigned_courier_id: courierId
      };

      const result = await trpc.updateOrderStatus.mutate(updateData);
      setOrders((prev: Order[]) => 
        prev.map((order: Order) => order.id === orderId ? result : order)
      );
    } catch (error) {
      setError('Failed to update order status');
      console.error('Update order status error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get patient name by ID
  const getPatientName = (patientId: number): string => {
    const patient = patients.find((p: Patient) => p.id === patientId);
    return patient ? patient.name : `Patient ID: ${patientId}`;
  };

  // Get courier name by ID
  const getCourierName = (courierId: number | null): string => {
    if (!courierId) return 'Not assigned';
    const courier = couriers.find((c: User) => c.id === courierId);
    return courier ? courier.name : `Courier ID: ${courierId}`;
  };

  // Login form
  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-4xl mb-2">🏥</div>
            <CardTitle className="text-2xl font-bold text-blue-800">Drug Delivery System</CardTitle>
            <CardDescription>Hospital Medication Management</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLoginForm((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLoginForm((prev) => ({ ...prev, password: e.target.value }))
                }
                required
              />
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main application dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🏥</div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Drug Delivery System</h1>
                <p className="text-sm text-gray-600">Hospital Medication Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{auth.user?.name}</p>
                <Badge variant="outline" className="text-xs">
                  {auth.user?.role.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders">📦 Orders</TabsTrigger>
            {(auth.user?.role === 'admin' || auth.user?.role === 'hospital_staff') && (
              <TabsTrigger value="patients">👥 Patients</TabsTrigger>
            )}
            {auth.user?.role === 'admin' && (
              <TabsTrigger value="new-order">➕ New Order</TabsTrigger>
            )}
            <TabsTrigger value="tracking">📍 Tracking</TabsTrigger>
          </TabsList>

          {/* Orders tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📦 Order Management
                  {isLoading && <div className="text-sm text-gray-500">Loading...</div>}
                </CardTitle>
                <CardDescription>
                  {auth.user?.role === 'admin' && 'Manage all orders and assign couriers'}
                  {auth.user?.role === 'hospital_staff' && 'Update medication preparation status'}
                  {auth.user?.role === 'courier' && 'View and update your assigned deliveries'}
                  {auth.user?.role === 'patient' && 'Track your medication orders'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📭</div>
                    <p>No orders found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order: Order) => (
                      <Card key={order.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold">Order #{order.id}</h3>
                                <Badge className={getStatusColor(order.status)}>
                                  {order.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Patient:</span> {getPatientName(order.patient_id)}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Medication:</span> {order.medication_details}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Courier:</span> {getCourierName(order.assigned_courier_id)}
                              </p>
                              {order.delivery_fee && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Delivery Fee:</span> ${order.delivery_fee.toFixed(2)}
                                </p>
                              )}
                              <p className="text-xs text-gray-400">
                                Created: {order.created_at.toLocaleDateString()}
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              {/* Hospital staff can mark as ready */}
                              {auth.user?.role === 'hospital_staff' && order.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateOrderStatus(order.id, 'obat_siap')}
                                  disabled={isLoading}
                                >
                                  ✅ Mark Ready
                                </Button>
                              )}
                              
                              {/* Admin can assign courier */}
                              {auth.user?.role === 'admin' && order.status === 'obat_siap' && (
                                <div className="flex gap-2">
                                  {couriers.map((courier: User) => (
                                    <Button
                                      key={courier.id}
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUpdateOrderStatus(order.id, 'assigned_courier', courier.id)}
                                      disabled={isLoading}
                                    >
                                      Assign to {courier.name}
                                    </Button>
                                  ))}
                                </div>
                              )}
                              
                              {/* Courier can update delivery status */}
                              {auth.user?.role === 'courier' && order.assigned_courier_id === auth.user.id && (
                                <div className="space-y-1">
                                  {order.status === 'assigned_courier' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateOrderStatus(order.id, 'in_transit')}
                                      disabled={isLoading}
                                    >
                                      🚚 Start Delivery
                                    </Button>
                                  )}
                                  {order.status === 'in_transit' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                      disabled={isLoading}
                                    >
                                      ✅ Mark Delivered
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patients tab */}
          {(auth.user?.role === 'admin' || auth.user?.role === 'hospital_staff') && (
            <TabsContent value="patients" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>👥 Patient Management</CardTitle>
                  <CardDescription>Register and manage patient information</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreatePatient} className="grid grid-cols-2 gap-4 mb-6">
                    <Input
                      placeholder="Patient Name"
                      value={patientForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPatientForm((prev: CreatePatientInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                    <Input
                      placeholder="Address"
                      value={patientForm.address}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPatientForm((prev: CreatePatientInput) => ({ ...prev, address: e.target.value }))
                      }
                      required
                    />
                    <Input
                      type="date"
                      placeholder="Date of Birth"
                      value={patientForm.date_of_birth}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPatientForm((prev: CreatePatientInput) => ({ ...prev, date_of_birth: e.target.value }))
                      }
                      required
                    />
                    <Input
                      placeholder="Queue Number"
                      value={patientForm.queue_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPatientForm((prev: CreatePatientInput) => ({ ...prev, queue_number: e.target.value }))
                      }
                      required
                    />
                    <Input
                      placeholder="Attending Doctor"
                      value={patientForm.attending_doctor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPatientForm((prev: CreatePatientInput) => ({ ...prev, attending_doctor: e.target.value }))
                      }
                      required
                    />
                    <Input
                      placeholder="Phone Number (optional)"
                      value={patientForm.phone || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPatientForm((prev: CreatePatientInput) => ({ ...prev, phone: e.target.value || null }))
                      }
                    />
                    <div className="col-span-2">
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Creating...' : '➕ Add Patient'}
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {patients.map((patient: Patient) => (
                      <Card key={patient.id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{patient.name}</h3>
                              <p className="text-sm text-gray-600">Queue: {patient.queue_number}</p>
                              <p className="text-sm text-gray-600">Doctor: {patient.attending_doctor}</p>
                              <p className="text-sm text-gray-600">Address: {patient.address}</p>
                              {patient.phone && (
                                <p className="text-sm text-gray-600">Phone: {patient.phone}</p>
                              )}
                            </div>
                            <Badge variant="outline">
                              DOB: {patient.date_of_birth.toLocaleDateString()}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* New Order tab */}
          {auth.user?.role === 'admin' && (
            <TabsContent value="new-order" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>➕ Create New Order</CardTitle>
                  <CardDescription>Create medication delivery orders for patients</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateOrder} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Patient</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={orderForm.patient_id}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setOrderForm((prev: CreateOrderInput) => ({ ...prev, patient_id: parseInt(e.target.value) }))
                        }
                        required
                      >
                        <option value={0}>Select a patient...</option>
                        {patients.map((patient: Patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.name} - Queue: {patient.queue_number}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Medication Details</label>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md"
                        rows={3}
                        placeholder="Enter medication details, dosage, and instructions..."
                        value={orderForm.medication_details}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setOrderForm((prev: CreateOrderInput) => ({ ...prev, medication_details: e.target.value }))
                        }
                        required
                      />
                    </div>
                    
                    <Button type="submit" disabled={isLoading || patients.length === 0}>
                      {isLoading ? 'Creating Order...' : '📦 Create Order'}
                    </Button>
                    
                    {patients.length === 0 && (
                      <p className="text-sm text-orange-600">
                        ⚠️ Please add patients first before creating orders.
                      </p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Tracking tab */}
          <TabsContent value="tracking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📍 Delivery Tracking</CardTitle>
                <CardDescription>Real-time tracking of medication deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🗺️</div>
                  <p>Delivery tracking with GPS coordinates</p>
                  <p className="text-sm">Real-time location updates will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
