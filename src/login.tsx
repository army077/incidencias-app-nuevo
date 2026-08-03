import React, { useState } from 'react';
import { MDBBtn, MDBContainer, MDBRow, MDBCol, MDBIcon, MDBInput } from 'mdb-react-ui-kit';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import './Login.css';

const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>(''); 
  const [password, setPassword] = useState<string>(''); 
  const navigate = useNavigate();

  const googleProvider = new GoogleAuthProvider();

  const handleGoogleLogin = async () => {
    setError(null); 
    try {
      // Inicia sesión con Google
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Verifica si el usuario está registrado en Firestore
      const userDocRef = doc(db, 'usuarios', user.uid); // Referencia al documento del usuario
      const userSnapshot = await getDoc(userDocRef);

      if (userSnapshot.exists()) {
        // Bloquear acceso si el usuario está dado de baja
        if (userSnapshot.data().activo === false) {
          setError('Usuario dado de baja. Contacte con Recursos Humanos.');
          await auth.signOut();
          return;
        }
        navigate('/')
      } else {
        setError('Usuario no registrado. Contacte con el administrador.');
        deleteUser(user)

        // Opcional: Cierra la sesión si no está registrado
        auth.signOut();
      }
    } catch (err: any) {
      setError(err.message); 
    }
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Verificar que el usuario esté activo en Firestore
      const q = query(collection(db, 'usuarios'), where('correo', '==', result.user.email));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0].data().activo === false) {
        await auth.signOut();
        setError('Usuario dado de baja. Contacte con Recursos Humanos.');
        return;
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <MDBContainer fluid className='background-radial-gradient overflow-hidden vh-100 d-flex justify-content-center align-items-center'>
      <div 
        className="p-5 rounded-3 shadow-lg"
        style={{
          maxWidth: '500px',  
        }}
      >
        <div className="text-center mb-4">
          <img 
            src="/ar_logo.png" 
            alt="Logo" 
            style={{ width: '120px', marginBottom: '15px' }} 
          />
          <h1 className="display-6 fw-bold" style={{ color: 'hsl(218, 81%, 95%)' }}>
            INCIDENCIAS AR
          </h1>
          <p style={{ color: 'hsl(218, 81%, 85%)' }}>
            Sistema de gestión de incidencias que te ayuda a organizar y seguir el progreso de tus reportes de manera eficiente y sencilla.
          </p>
        </div>

        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

        <form onSubmit={handleEmailPasswordLogin} className="d-flex flex-column gap-3">
          <p>Correo Electrónico</p>
          <MDBInput
            id='email'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', borderRadius: '10px' }}
          />

          <p>Contraseña</p>
          <MDBInput
            id='password'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', borderRadius: '10px' }}
          />

          <br />
          <div className="d-flex justify-content-between gap-2">
            <MDBBtn
              type="submit"
              className="w-100"
              style={{
                backgroundColor: '#FD0900',
                color: 'white',
                padding: '10px 0',
                borderRadius: '25px',
                fontSize: '16px',
                fontWeight: 'bold',
                height: '50px',
              }}
            >
              Iniciar Sesión
            </MDBBtn>

            <br />
            <MDBBtn
              onClick={handleGoogleLogin}
              className="w-100"
              style={{
                backgroundColor: '#FD0900',
                color: 'white',
                padding: '10px 0',
                borderRadius: '25px',
                fontSize: '16px',
                fontWeight: 'bold',
                height: '50px'
              }}
            >
              <MDBIcon fab icon='google' size="lg" className="me-2" /> Google
            </MDBBtn>
          </div>
        </form>
      </div>
    </MDBContainer>
  );
};

export default Login;
