import React, { useEffect, useState } from "react";
import { Button, Table, message } from "antd";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import moment from "moment";
import axios from "axios";
// import { usuariosPermitidos, usuariosSidebar } from "../../user_config";

type Permiso = {
  id: string;
  fecha_solicitud: string;
  nombre_completo: string;
  correo: string;
  jefe_inmediato: string;
  area: string;
  tipo_permiso: string;
  urgencia: boolean;
  comentarios: string;
  status: string;
  fecha_permiso: any;
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isUserAllowed, setIsUserAllowed] = useState(false);
  const [usuariosSidebar, setUsuariosSidebar] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usuariosPermitidos, setUsuariosPermitidos] = useState<Record<string, string>>({});
  const [loadingGerentes, setLoadingGerentes] = useState(true);


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

        console.log("Correos de líderes inmediatos:", correos);
        setUsuariosSidebar(correos); // ✅ ahora sí es string[]
      } catch (e) {
        setError("Error al cargar líderes inmediatos.");
      } finally {
        setLoading(false);
      }
    };
    fetchLideres();
  }, []);



  const handleNewPermitClick = () => {
    navigate("/create_permit");
  };

  const handleNewIncidentClick = () => {
    navigate("/incidencias/create");
  };

  useEffect(() => {
    if (loading) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
        setIsUserAllowed(usuariosSidebar.includes(user.email || ""));
      } else {
        setIsUserAllowed(false);
        message.error("No estás autenticado.");
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [loading]);

  useEffect(() => {
    const fetchPermisos = async () => {
      if (!userEmail) return;

      try {
        const response = await fetch(
          `https://desarrollotecnologicoar.com/api3/permiso_por_correo/${userEmail}`
        );

        if (response.ok) {
          const data = await response.json();
          const permisosArray: Permiso[] = Array.isArray(data) ? data : [data];
          const sorted = permisosArray.sort(
            (a, b) => new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime()
          );
          setPermisos(sorted);
        } else {
          message.error("Aún no has solicitado permisos.");
          setPermisos([]);
        }
      } catch (error) {
        console.error("Error al llamar a la API:", error);
        message.error("Hubo un error al obtener los permisos.");
        setPermisos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermisos();
  }, [userEmail]);

  const columns = [
    {
      title: "Id de solicitud",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Fecha de Solicitud",
      dataIndex: "fecha_solicitud",
      key: "fecha_solicitud",
      render: (fecha: any) => moment(fecha).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Nombre Completo",
      dataIndex: "nombre_completo",
      key: "nombre_completo",
    },
    {
      title: "Jefe Inmediato",
      dataIndex: "jefe_inmediato",
      key: "jefe_inmediato",
    },
    {
      title: "Tipo de Permiso",
      dataIndex: "tipo_permiso",
      key: "tipo_permiso",
    },
    {
      title: "Urgencia",
      dataIndex: "urgencia",
      key: "urgencia",
      render: (urgencia: boolean) => (
        <span style={{ color: urgencia ? "orange" : "blue" }}>
          {urgencia ? "Urgente" : "No Urgente"}
        </span>
      ),
    },
    {
      title: "Comentarios",
      dataIndex: "comentarios",
      key: "comentarios",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color = "";
        switch (status) {
          case "Aprobado":
            color = "green";
            break;
          case "Pendiente":
            color = "orange";
            break;
          case "Rechazado":
            color = "red";
            break;
          default:
            color = "gray";
        }
        return (
          <span>
            <strong style={{ color }}>{status}</strong>
          </span>
        );
      },
    },
    {
      title: "Fecha de Permiso",
      dataIndex: "fecha_permiso",
      key: "fecha_permiso",
      render: (fecha: any) => moment(fecha).format("DD/MM/YYYY"),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ textAlign: "center" }}>Bienvenido a la página de incidencias</h1>

      {/* Contenedor para centrar botones */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px", // Espaciado entre botones
          marginTop: "20px",
        }}
      >
        {isUserAllowed && (
          <Button
            type="primary"
            size="large"
            onClick={handleNewIncidentClick}
            style={{
              padding: "10px 40px",
              fontSize: "18px",
              backgroundColor: "#ff4d4f", // Color de fondo personalizado
              borderColor: "#ff4d4f", // Borde del mismo color
            }}
          >
            Crear incidencia
          </Button>
        )}

        <Button
          type="primary"
          size="large"
          onClick={handleNewPermitClick}
          style={{
            padding: "10px 40px",
            fontSize: "18px",
          }}
        >
          Solicitar permiso
        </Button>
      </div>

      {/* Tabla para mostrar los permisos */}
      <div style={{ marginTop: "40px" }}>
        <Table
          dataSource={permisos || []}
          columns={columns}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '30', '50'] }}
          scroll={{ y: 'calc(100vh - 280px)' }}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

export default HomePage;
