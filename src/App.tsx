import { GitHubBanner, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { Image } from "antd";
import { useContext } from "react";
import { Dashboard } from "./pages/dashboard/dashboard";
import { BarChartOutlined, InboxOutlined, LineChartOutlined, UserAddOutlined, PrinterFilled, PrinterOutlined, FilePdfOutlined, FileAddFilled } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { PDFEditor } from "./pages/impresion_actas/formato_acta"
import HomePage from "./pages/inicio/inicio";
import {
  ErrorComponent,
  ThemedLayoutV2,
  ThemedSiderV2,
  useNotificationProvider,
} from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";
import { ColorModeContext } from "./contexts/color-mode"
import routerBindings, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router-v6";
import dataProvider from "@refinedev/simple-rest";
import { App as AntdApp } from "antd";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Header } from "./components/header";
import { ColorModeContextProvider } from "./contexts/color-mode";
import {
  BlogPostCreate,
  BlogPostEdit,
  BlogPostList,
  BlogPostShow,
} from "./pages/incidencias";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "./firebaseConfig"; // Asegúrate de que tu archivo firebaseConfig.js esté bien configurado
import Login from "./login"; // El componente de Login que creaste
import UserCreate from "./pages/alta_usuarios/users_form";
import { CreatePermit } from "./pages/inicio/new_permit";
import { TablaPermisos } from "./pages/bandeja_entrada/bandeja_entrada";
import { IncomingMessage } from "http";
import { useUnreviewedPermitsCount } from "./hooks/conteoPermisos";
import { DetallePermiso } from "./pages/bandeja_entrada/permiso_id";
import { ListadoActas } from "./pages/incidencias/actas/listado_actas";
import { FaUserTie } from "react-icons/fa";
import { LideresGeneral } from "./pages/alta_usuarios/lideres";
import axios from "axios";



function App() {
  const [authenticated, setAuthenticated] = useState(false); // Estado de autenticación
  const [loading, setLoading] = useState(true); // Para mostrar un estado de carga
  const [userEmail, setuserEmail] = useState<string | null>(null);
  const [userArea, setUserArea] = useState<string | null>(null);
  const [usuariosSidebar, setUsuariosSidebar] = useState<string[]>([]);
  const count = useUnreviewedPermitsCount();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthenticated(true);
        setuserEmail(user.email);
        try {
          const q = query(collection(db, "usuarios"), where("correo", "==", user.email));
          const snap = await getDocs(q);
          if (!snap.empty) setUserArea(snap.docs[0].data().area ?? null);
        } catch { /* ignorar */ }
      } else {
        setAuthenticated(false);
        setuserEmail(null);
        setUserArea(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);



  const [loadingLideres, setLoadingLideres] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type Lider = { id: number | string; nombre: string; correo: string };
  type Gerentes = Record<string, string>;

  useEffect(() => {
    const fetchLideres = async () => {
      try {
        const { data } = await axios.get<Lider[]>(
          "https://desarrollotecnologicoar.com/api3/lideres_inmediatos/"
        );
        const correos = (data ?? [])
          .map(l => l.correo)
          .filter((c): c is string => Boolean(c));
        setUsuariosSidebar(correos); // ✅ ahora sí es string[]
      } catch (e) {
        setError("Error al cargar líderes inmediatos.");
      } finally {
        setLoadingLideres(false);
      }
    };
    fetchLideres();
  }, []);

  // Mostrar mensaje de carga
  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "20%" }}>Cargando...</div>;
  }

  const LogoTitle = () => {
    const { mode } = useContext(ColorModeContext); // Obtiene el modo de color
    const modeImage = mode === "dark" ? "/ar_logo.png" : "LOGO_ASIAROBOTICA.png"; // Define la imagen según el modo

    return (
      <div style={{ display: "flex", alignItems: "center", padding: "10px" }}>
        <Link to="/">
          <Image
            src={modeImage} // Cambia la imagen según el tema
            alt="Logo"
            width={150} // Ajusta el tamaño del logo si es necesario
            preview={false} // Evita la vista previa de la imagen en Ant Design
            style={{ cursor: "pointer" }} // Cambia el cursor al pasar por encima
          />
        </Link>
      </div>
    );
  };


  const normArea = (a: string) =>
    a.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "_");
  const canSeeLideres =
    userEmail === 'developer@asiarobotica.com' || userEmail === 'marada@asiarobotica.com' ||
    normArea(userArea ?? '') === 'recursos_humanos';

  const resources =
    usuariosSidebar.includes(userEmail || "") // Verifica si el correo está en la lista
      ? [
        {
          name: "tabla_permisos",
          list: "/bandeja_entrada",
          meta: {
            label: "Bandeja entrada",
            icon: (
              <div style={{ display: "flex", alignItems: "center" }}>
                {count > 0 ? (
                  <div
                    style={{
                      backgroundColor: "#ff4d4f",
                      color: "white",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginLeft: "0px",
                      fontSize: "12px",
                    }}
                  >
                    {count}
                  </div>
                ) : (
                  <InboxOutlined style={{ marginRight: "8px" }} />
                )}
              </div>
            ),
          },
        },
        {
          name: "incidencias",
          list: "/incidencias",
          create: "/incidencias/create",
          edit: "/incidencias/edit/:id",
          show: "/incidencias/show/:id",
          meta: { canDelete: true },
        },
        {
          name: "dashboard",
          list: "/dashboard",
          meta: { label: "Panel de control", icon: <BarChartOutlined /> },
        },
        {
          name: "user_form",
          list: "/user_form",
          meta: { label: "Alta de usuarios", icon: <UserAddOutlined /> },
        },
        {
          name: "impresion_acta",
          list: "/impresion_acta",
          meta: { label: "Impresión de acta", icon: <FilePdfOutlined /> },
        },
        ...(canSeeLideres ? [{
          name: "Lideres",
          list: "/lideres",
          meta: { label: "Lideres", icon: <FaUserTie /> },
        }] : []),
      ]
      : [];
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <AntdApp>
            <DevtoolsProvider>
              {authenticated ? (
                // Si el usuario está autenticado, renderiza Refine
                <Refine
                  dataProvider={dataProvider("https://desarrollotecnologicoar.com/api3")}
                  notificationProvider={useNotificationProvider}
                  routerProvider={routerBindings}
                  // Sider={CustomSider}

                  resources={resources}
                  options={{
                    syncWithLocation: true,
                    warnWhenUnsavedChanges: true,
                    useNewQueryKeys: true,
                    projectId: "rG27AD-YONvIw-urDRkU",
                  }}
                >
                  <Routes>
                    <Route
                      element={
                        <ThemedLayoutV2 Header={() => <Header sticky />} Title={() => <LogoTitle />}>
                          <Outlet />
                        </ThemedLayoutV2>
                      }
                    >
                      <Route path="/" element={<HomePage />} /> {/* Ruta de inicio */}

                      <Route path="/incidencias">
                        <Route index element={<BlogPostList />} />
                        <Route path="create" element={<BlogPostCreate />} />
                        <Route path="edit/:id" element={<BlogPostEdit />} />
                        <Route path="show/:id" element={<BlogPostShow />} />
                      </Route>

                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/user_form" element={<UserCreate />} />
                      <Route path="/create_permit" element={<CreatePermit />} />
                      <Route path="/bandeja_entrada" element={<TablaPermisos />} />
                      <Route path="/detalle_permiso/:id" element={<DetallePermiso />} />
                      <Route path="/impresion_acta" element={<PDFEditor />} />
                      <Route path='/actas' element={<ListadoActas />} />'
                      <Route path="/lideres" element={<LideresGeneral />} />

                      <Route path="*" element={<ErrorComponent />} /> {/* Ruta para errores */}
                    </Route>
                  </Routes>

                  <RefineKbar />
                  <UnsavedChangesNotifier />
                </Refine>
              ) : (
                // Si no está autenticado, redirige al Login
                <Login />
              )}
              <DevtoolsPanel />
            </DevtoolsProvider>
          </AntdApp>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
