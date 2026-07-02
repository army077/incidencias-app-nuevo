import { auth, db } from "../../firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Table, message, Spin, Button, Tabs } from "antd";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import moment from "moment";
// import { usuariosPermitidos } from "../../user_config";

// Definimos la interfaz para los permisos
interface Permiso {
  id: string;
  fecha_solicitud: string;
  nombre_completo: string;
  correo: string;
  jefe_inmediato: string;
  tipo_permiso: string;
  urgencia: boolean;
  comentarios: string;
  fecha_permiso: string;
  status: string;
  area: string;
  correo_lider: string;
}

// Definimos las columnas de la tabla
const columns = (navigate: (path: string) => void) => [
  {
    title: "Fecha de solicitud",
    dataIndex: "fecha_solicitud",
    key: "fecha_solicitud",
    render: (fecha: string) => moment(fecha).format("DD/MM/YYYY HH:mm")
  },
  { title: "Nombre", dataIndex: "nombre_completo", key: "nombre_completo" },
  { title: "Area", dataIndex: "area", key: "area" },
  { title: "Jefe Inmediato", dataIndex: "jefe_inmediato", key: "jefe_inmediato" },
  { title: "Tipo de permiso", dataIndex: "tipo_permiso", key: "tipo_permiso" },
  { title: "Urgencia", dataIndex: "urgencia", key: "urgencia" },
  { title: "Comentarios", dataIndex: "comentarios", key: "comentarios" },
  {
    title: "Fecha de permiso",
    dataIndex: "fecha_permiso",
    key: "fecha_permiso",
    render: (fecha: string) => fecha ? moment(fecha.substring(0, 10), "YYYY-MM-DD").format("DD/MM/YYYY") : "-"
  },
  {
    title: "Status del permiso",
    dataIndex: "status",
    key: "status",
    render: (status: string, record: Permiso) => {
      const color =
        status === "Aprobado" ? "green" :
          status === "Pendiente" ? "orange" : "red";
      const isDisabled = status === "Aprobado" || status === "Rechazado";

      return (
        <Button
          style={{ backgroundColor: color, color: "white", border: "none" }}
          disabled={isDisabled}
          onClick={() => navigate(`/detalle_permiso/${record.id}`)}
        >
          {status}
        </Button>
      );
    },
  },
];

export const TablaPermisos: React.FC = () => {
  const [data, setData] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const navigate = useNavigate();
  const [usuariosPermitidos, setUsuariosPermitidos] = useState<string[]>([]);
  const [loadingGerentes, setLoadingGerentes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  type Gerentes = string[];

  // -- Función para normalizar un texto (por si lo necesitas para "area") --
  const convertirTexto = (texto: string): string =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .toLowerCase()
      .replace(/\s+/g, "_"); // Espacios por guiones bajos


  useEffect(() => {
    const fetchGerentes = async () => {
      try {
        const { data } = await axios.get<Gerentes>(
          "https://desarrollotecnologicoar.com/api3/usuarios_permitidos/"
        );
        setUsuariosPermitidos(data ?? []);
      } catch (e) {
        setError((prev) => prev ?? "Error al cargar gerentes."); // conserva el primero si ya hay
      } finally {
        setLoadingGerentes(false);
      }
    };

    fetchGerentes();
  }, []);
  // -- 1) Detectar si el usuario está en "usuariosPermitidos" o no --
  useEffect(() => {
    if (loadingGerentes) return; // Esperar a que se carguen los gerentes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        message.error("El usuario no está autenticado.");
        setLoading(false);
        return;
      }

      try {
        const correo = user.email || "";

        // => Si está en usuariosPermitidos, pedimos TODOS los permisos
        if (usuariosPermitidos.includes(correo)) {
          console.log("Usuario en lista de usuariosPermitidos, trayendo permisos generales...");
          await fetchPermisosGenerales();
        } else {
          // => Caso contrario, necesitamos saber su area y su nombre
          console.log("Usuario NO está en usuariosPermitidos, trayendo sólo sus permisos/área...");
          const q = query(collection(db, "usuarios"), where("correo", "==", correo));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0].data();
            // Guardamos área normalizada y el nombre
            const userArea = convertirTexto(userDoc.area) || "";
            setArea(userArea);
            setUserName(userDoc.correo || '');

            // Cuando ya tengamos el area y el nombre, llamamos a fetchPermisosFiltrados
            await fetchPermisosFiltrados(userArea, userDoc.nombre);
          } else {
            message.error("No se encontró información del usuario en la colección 'usuarios'.");
          }
        }
      } catch (error) {
        console.error("Error al obtener datos del usuario:", error);
        message.error("Hubo un error al cargar los datos del usuario.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadingGerentes, usuariosPermitidos]);
  const fetchPermisosGenerales = async () => {
    try {
      const response = await axios.get<Permiso[]>("https://desarrollotecnologicoar.com/api3/permisos");
      setData(response.data);
    } catch (error) {
      console.error("Error al obtener permisos generales:", error);
      message.error("Hubo un error al cargar los permisos generales.");
    }
  };


  const fetchPermisosFiltrados = async (userArea: string, correo: string) => {
    try {
      console.log("Buscando permisos para el área:", userArea, "y el correo:", correo);

      const url = `https://desarrollotecnologicoar.com/api3/permisos`;
      let response = await axios.get<Permiso[]>(url);


      setData(response.data.filter((permiso) => permiso.area === userArea || permiso.correo_lider === correo));
    } catch (error) {
      console.error("Error al obtener permisos filtrados:", error);
      message.error("Hubo un error al cargar los permisos por área o jefe_inmediato.");
    }
  };

  // -- 4) Filtrar permisos por status y renderizar la tabla --
  const sortByRecent = (arr: Permiso[]) =>
    [...arr].sort((a, b) => new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime());

  const permisosPendientes = sortByRecent(data.filter((permiso) => permiso.status === "Pendiente"));
  const permisosAprobados = sortByRecent(data.filter((permiso) => permiso.status === "Aprobado"));
  const permisosRechazados = sortByRecent(data.filter((permiso) => permiso.status === "Rechazado"));

  if (loading) {
    return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  }

  return (
    <Tabs defaultActiveKey="1" centered tabBarGutter={20} tabBarStyle={{ minHeight: 48 }}>
      <Tabs.TabPane tab="Pendientes" key="1">
        <Table
          columns={columns(navigate)}
          dataSource={permisosPendientes}
          rowKey="id"
          pagination={{
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30', '50'],
            onChange: (_, size) => setPageSize(size),
          }}
          scroll={{ y: 'calc(100vh - 260px)' }}
          style={{ width: '100%' }}
        />
      </Tabs.TabPane>

      <Tabs.TabPane tab="Aprobados" key="2">
        <Table
          columns={columns(navigate)}
          dataSource={permisosAprobados}
          rowKey="id"
          pagination={{
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30', '50'],
            onChange: (_, size) => setPageSize(size),
          }}
          scroll={{ y: 'calc(100vh - 260px)' }}
          style={{ width: '100%' }}
        />
      </Tabs.TabPane>

      <Tabs.TabPane tab="Rechazados" key="3">
        <Table
          columns={columns(navigate)}
          dataSource={permisosRechazados}
          rowKey="id"
          pagination={{
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30', '50'],
            onChange: (_, size) => setPageSize(size),
          }}
          scroll={{ y: 'calc(100vh - 260px)' }}
          style={{ width: '100%' }}
        />
      </Tabs.TabPane>
    </Tabs>
  );
};
