import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import axios from "axios";
import { List, Spin, Table, Row, Col, message } from "@pankod/refine-antd";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
// import { usuariosPermitidos } from "../../user_config"; // Importar lista global de usuarios permitidos
import moment from "moment";
import { ColorModeContext } from "../../contexts/color-mode";
import { useContext } from "react";

interface IncidenciasGraficaProps {
    agrupacion: 'dia' | 'semana' | 'mes';
    dates: [string | null, string | null];
}

interface TiempoIncidencias {
    name: string;
    value: number;
}

type Gerentes = string[];

export const IncidenciasPorTiempoList: React.FC<IncidenciasGraficaProps> = ({ agrupacion, dates }) => {
    const [data, setData] = useState<TiempoIncidencias[]>([]);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [area, setArea] = useState<string | null>(null);
    const [usuariosPermitidos, setUsuariosPermitidos] = useState<string[]>([]);
    const [loadingGerentes, setLoadingGerentes] = useState(true);
    const [error, setError] = useState<string | null>(null);


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

    // **Función para obtener datos del usuario autenticado**
    useEffect(() => {
        if (loadingGerentes) return; // Espera a los gerentes
        const fetchUserData = async (currentUser: any) => {
            try {
                const correo = currentUser.email;
                setUserEmail(correo);

                const q = query(collection(db, "usuarios"), where("correo", "==", correo));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0].data();
                    const userArea = convertirTexto(userDoc.area);
                    setArea(userArea);

                    // Si el usuario está permitido, fetch sin filtro de área; si no, con filtro
                    if (usuariosPermitidos.includes(correo)) {
                        await fetchData(); // Acceso completo
                    } else {
                        await fetchData(userArea); // Filtrar por área
                    }
                } else {
                    message.error("No se encontró información del usuario.");
                }
            } catch (error) {
                console.error("Error al obtener datos del usuario:", error);
                message.error("Error al cargar los datos del usuario.");
            } finally {
                setLoading(false);
            }
        };

        // Escuchar cambios de autenticación
        onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                fetchUserData(currentUser);
            } else {
                message.error("Usuario no autenticado.");
                setLoading(false);
            }
        });
    }, [agrupacion, dates, loadingGerentes]); // Actualiza cuando cambia la agrupación o fechas

    const convertirTexto = (texto: string): string =>
        texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "_");

    // **Función para obtener incidencias con o sin filtro de área**
    const fetchData = async (areaUsuario?: string) => {
        try {
            setLoading(true);
            let url = `https://www.desarrollotecnologicoar.com/api3/incidencias_fechas_area?agrupacion=${agrupacion}`;

            const [startDate, endDate] = dates;
            if (startDate && endDate) {
                url += `&startDate=${startDate}&endDate=${endDate}`;
            }

            // Si el usuario no tiene acceso completo, añadir área como filtro
            if (areaUsuario) {
                url += `&area=${encodeURIComponent(areaUsuario)}`;
            }

            const response = await axios.get(url);
            const incidencias = response.data.map((item: any) => ({
                name: item.fecha
                    ? item.fecha.slice(0, 10)
                    : item.semana
                        ? `Semana ${item.semana}`
                        : item.mes || "Sin agrupar",
                value: item.total_incidencias,
            }));

            setData(incidencias);
        } catch (error) {
            console.error("Error al obtener los datos:", error);
            message.error("Error al cargar los datos.");
        } finally {
            setLoading(false);
        }
    };



    // Configuración de columnas de la tabla
    const columns = [
        {
            title: agrupacion === 'dia' ? 'Fecha' : agrupacion === 'semana' ? 'Semana' : 'Mes',
            dataIndex: 'name',
            key: 'name',
            width: '50%',
        },
        {
            title: 'Conteo incidencias',
            dataIndex: 'value',
            key: 'value',
            width: '50%',
        },
    ];
    const { mode } = useContext(ColorModeContext);
    const modeImage = mode === "dark" ? "#0fad03" : "#020675";




    if (loading) return <Spin size="large" />;

    return (
        <List title={`Incidencias agrupadas por ${agrupacion}`}>
            <Row gutter={[16, 16]}>
                {/* Gráfica de líneas */}
                <Col xs={24} md={14}>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 'dataMax + 50']} tickCount={8} />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={modeImage}
                                strokeWidth={3}
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Col>

                {/* Tabla */}
                <Col xs={24} md={10}>
                    <div style={{ height: 400, overflowY: 'scroll' }}>
                        <Table
                            columns={columns}
                            dataSource={data}
                            pagination={false}
                            rowKey="name"
                            scroll={{ x: 'max-content', y: 275 }}
                        />
                    </div>
                </Col>
            </Row>
        </List>
    );
};
