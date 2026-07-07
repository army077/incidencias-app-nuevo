import React, { useState, useEffect, act } from 'react';
import { useForm } from "@refinedev/antd";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { useLocation } from "react-router-dom";
import { Form, Card, Avatar, Typography, Spin, message, List, Space, Select, DatePicker, Button, Row, Col } from "antd";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
// import { jefesInmediatos } from '../incidencias';
import { opciones } from '../alta_usuarios/users_form';
import warning from 'antd/es/_util/warning';
import { cedeConfigurations } from './pdf_config';
import axios from 'axios';

// valores del acta
type ActaValues = {
    cede: string;
    fecha: string;
    hora: string;
    asunto: string;
    lider_inmediato: string;
    area_lider: string;
    empleado: string;
    rol: string;
    fecha_suceso: string;
    info_registro: string;
    status_acta: string;
    area: string;
};
const initialActaValues: ActaValues = {
    cede: 'españoles',
    fecha: '',
    hora: '',
    asunto: '',
    lider_inmediato: '',
    area_lider: '',
    empleado: '',
    rol: '',
    fecha_suceso: '',
    info_registro: '',
    status_acta: '',
    area: '',
};


export const PDFEditor = () => {
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();
    const formData = location.state || {};
    const [userData, setUserData] = useState<any>(null);
    const [areaUsers, setAreaUsers] = useState<any[]>([]);
    const [Cede, setCede] = useState("")
    const [loadingLideres, setLoadingLideres] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [jefesInmediatos, setJefesInmediatos] = useState<Lider[]>([]);
    type Lider = {
        id: number;
        nombre: string;
        area: string;
    };


    useEffect(() => {
        const fetchLideres = async () => {
            try {
                const { data } = await axios.get<Lider[]>(
                    "https://desarrollotecnologicoar.com/api3/lideres_inmediatos/"
                );
                setJefesInmediatos(data ?? []);
            } catch (e) {
                setError("Error al cargar líderes inmediatos.");
            } finally {
                setLoadingLideres(false);
            }
        };
        fetchLideres();
    }, []);

    const formatearArea = (area: string) => {
        const conEspacios = area.replace(/_/g, ' ');
        return conEspacios.charAt(0).toUpperCase() + conEspacios.slice(1);
    };

    const jefesInmediatosOptions = jefesInmediatos.map((jefe) => ({
        value: jefe.nombre,
        label: `${jefe.nombre} - ${formatearArea(jefe.area)}`,
        area: formatearArea(jefe.area),
    }));

    // Inicializar actaValues con los datos recibidos
    const [actaValues, setActaValues] = useState<ActaValues>({
        ...initialActaValues,
        ...formData,
        fecha_permiso: formData.fecha_permiso || '',
        info_registro: formData.info_registro || '',
        area: formData.area || '',
        empleado: formData.nombre_emisor || '',
    });
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);


    // Función para obtener los datos del usuario autenticado
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const q = query(collection(db, "usuarios"), where("correo", "==", user.email));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const userDoc = querySnapshot.docs[0].data();
                        setUserData(userDoc);

                        // Obtener usuarios por área
                        await fetchUsersByArea(userDoc.area);
                    } else {
                        message.error("No se encontró información del usuario.");
                    }
                } catch (error) {
                    console.error("Error al obtener datos del usuario:", error);
                    message.error("Error al cargar los datos del usuario.");
                }
            }
        });

        return () => unsubscribe();
    }, []);

    // función para incluir unicamente a los usuarios del área del jefe indmediato
    const fetchUsersByArea = async (area: string) => {
        try {
            const q = query(collection(db, "usuarios"));
            const querySnapshot = await getDocs(q);

            const users = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            setAreaUsers(users); // Actualiza el estado con los usuarios obtenidos
        } catch (error) {
            console.error("Error al obtener usuarios por área:", error);
            message.error("Error al cargar los usuarios del área.");
        }
    };


    const formatearFechaEspanol = (fechaStr: string): string => {
        if (!fechaStr) return "";
        const partes = fechaStr.slice(0, 10).split('-').map(Number);
        if (partes.length < 3 || isNaN(partes[0])) return fechaStr;
        const [anio, mes, dia] = partes;
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        return `${dia} de ${meses[mes - 1]}, ${anio}`;
    };

    const drawFields = async (pdfDoc: PDFDocument, actaValues: ActaValues, cede: string) => {
        const config = cedeConfigurations[cede];
        if (!config) {
            throw new Error(`No hay configuración definida para la cede: ${cede}`);
        }

        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const fieldsToDraw = {
            fecha: formatearFechaEspanol(actaValues.fecha || ""),
            hora: actaValues.fecha?.slice(11, 16) || "",
            asunto: actaValues.asunto,
            lider_recortado: actaValues.lider_inmediato, // solo el nombre del líder
            lider_area: actaValues.area_lider ? `Jefe de ${actaValues.area_lider}` : "", // cargo del líder
            empleado: actaValues.empleado,
            fecha_suceso: formatearFechaEspanol(actaValues.fecha_suceso || ""),
            area: actaValues.area,           // área del empleado
        };

        Object.entries(fieldsToDraw).forEach(([field, value]) => {
            if (value && config[field]) {
                let { x, y, size = 10 } = config[field];
                if (value.length > 40) {
                    size = 7;
                } else if (value.length > 30) {
                    size = 8;
                }
                firstPage.drawText(value, { x, y: firstPage.getHeight() - y, size, font: helveticaFont, color: rgb(0, 0, 0) });
            }
        });
    };


    useEffect(() => {
        const generatePdfPreview = async () => {
            const lider_recortado = actaValues.lider_inmediato.includes('-')
                ? actaValues.lider_inmediato.slice(0, actaValues.lider_inmediato.indexOf('-'))
                : actaValues.lider_inmediato; // Si no hay '-', usa toda la cadena

            const caracter_recortado = actaValues.lider_inmediato.includes('-')
                ? actaValues.lider_inmediato.slice(actaValues.lider_inmediato.indexOf('-') + 1, actaValues.lider_inmediato.length)
                : actaValues.lider_inmediato; // Si no hay '-', usa toda la cadena
            try {
                const pdfPath = cede();
                if (!pdfPath) {
                    throw new Error("Ruta de PDF no encontrada. Selecciona una cede válida.");
                }
                const existingPdfBytes = await fetch(pdfPath).then((res) => res.arrayBuffer());
                const pdfDoc = await PDFDocument.load(existingPdfBytes);

                // Dibujar los campos en el PDF
                await drawFields(pdfDoc, actaValues, actaValues.cede);

                // Generar el PDF modificado
                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            } catch (error) {
                console.error("Error al generar el PDF:", error);
            }
        };

        generatePdfPreview();
    }, [actaValues]);

    const generarPDF = async () => {
        try {
            setIsLoading(true);
            const pdfPath = cede();
            if (!pdfPath) {
                message.error("Por favor, selecciona una cede válida.");
                setIsLoading(false);
                return;
            }

            console.log("Generando PDF con cede:", pdfPath);

            const existingPdfBytes = await fetch(pdfPath).then((res) => {
                if (!res.ok) {
                    throw new Error("Error al cargar el PDF base.");
                }
                return res.arrayBuffer();
            });

            const pdfDoc = await PDFDocument.load(existingPdfBytes);

            console.log("PDF cargado exitosamente.");

            await drawFields(pdfDoc, actaValues, actaValues.cede);

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: "application/pdf" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `Acta_${actaValues.fecha || "sin_fecha"}.pdf`;
            link.click();

            message.success("PDF generado exitosamente.");
        } catch (error) {
            console.error("Error al generar el PDF:", error);
            message.error("Hubo un error al generar el PDF. Por favor, inténtalo nuevamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: keyof ActaValues, value: any) => {
        setActaValues((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const cede = () => {
        switch (actaValues.cede) {
            case "8_de_julio": return "/acta_8julio.pdf";
            case "españoles": return "/acta_españoles.pdf";
            case "cdmx": return "/acta_cdmx.pdf";
            case "mty": return "/acta_mty.pdf";
            case "ocotlan": return "/acta_ocotlan.pdf";
            case "juan_manuel": return "/acta_jm.pdf";
            case "aldama": return "/acta_aldama.pdf";
            default: return null;
        }
    };

    return (
        <Row gutter={16} style={{ padding: 24 }}>
            <Col span={12}>
                <Card title="GENERAR ACTA" bordered={false} style={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)", margin: "auto", textAlign: 'center' }} >
                    <h3>Llena los siguientes datos para imprimir el acta prellenada. (opcional)</h3>
                    <Form>
                        <Form.Item label='Selecciona la cede del acta: ' name='cede' initialValue={"españoles"}>
                            <Select options={[
                                { value: "juan_manuel", label: "Juan Manuel 1401, Col Americana, Villaseñor, 44600 Guadalajara, Jal." },
                                { value: "8_de_julio", label: "Av. 8 de Julio 1626, Morelos Guadalajara Jal." },
                                { value: "españoles", label: "Españoles 91 la Duraznera, San Pedro Tlaquepaque Jal" },
                                { value: "cdmx", label: "Hacienda Escolástica #131, Hacienda del Rosario, Azcapotzalco CDMX" },
                                { value: "mty", label: "Vicente Suarez 962, Col. Obrera, Monterrey, N.L" },
                                { value: "ocotlan", label: "Noviembre 187 A, Col. Pedro Moreno, Ocotlan Jal" },
                                { value: "aldama", label: "C. Aldama 679, El Mante, 45235 Zapopan, Jal." },
                            ]} onChange={(value) => handleChange("cede", value)} />
                        </Form.Item>
                        {/* --------------------------------------------------------------------------------------------------------------- */}
                        <Form.Item label='Ingresa la fecha y hora en que se levantará el acta:' name='fecha'>
                            <DatePicker style={{ width: "100%" }} showTime onChange={(date, dateString) => handleChange("fecha", dateString)} />
                        </Form.Item>
                        {/* --------------------------------------------------------------------------------------------------------------- */}
                        <Form.Item label='Ingresa el asunto relacionado al acta: ' name='asunto'>
                            <Select options={[
                                { value: "Mala actitud", label: "Reporte de actitud (irresponsabilidad, acciones negativas, daños, etc)." },
                                { value: "Permiso de llegada tarde", label: "Permiso de llegada tarde por asuntos personales." },
                                { value: "Permiso de inasistencia a cuenta de vacaciones.", label: "Permiso de inasistencia a cuenta de vacaciones." },
                                { value: "Permiso de salida temprano.", label: "Permiso de salida temprano." },
                                { value: "Llegada tarde no justificada.", label: "Llegada tarde no justificada." },
                                { value: "Permiso de llegada tarde por cita médica (IMSS).", label: "Permiso de llegada tarde por cita médica (IMSS)." },
                                { value: "Falta justificada de acuerdo al Reglamento Interior de Trabajo.", label: "Falta justificada de acuerdo al Reglamento Interior de Trabajo." },
                                { value: "Falta injustificada.", label: "Falta injustificada." },
                                { value: "Permiso tiempo x tiempo controlado", label: "Permiso tiempo x tiempo controlado" },
                                { value: "Falta por incapacidad del IMSS.", label: "Falta por incapacidad del IMSS." },
                                { value: "Permiso de inasistencia sin goce de sueldo.", label: "Permiso de inasistencia sin goce de sueldo." },
                            ]} onChange={(value) => handleChange("asunto", value)} />
                        </Form.Item>
                        {/* --------------------------------------------------------------------------------------------------------------- */}
                        <Form.Item label='Nombre del líder inmediato del afectado:' name='lider_inmediato'>
                            <Select
                                options={jefesInmediatosOptions}
                                onSelect={(value, option,) => {
                                    handleChange("lider_inmediato", value);  // solo el nombre
                                    handleChange("area_lider", option.area); // guarda área por separado
                                }}
                            />
                        </Form.Item>
                        {/* --------------------------------------------------------------------------------------------------------------- */}
                        <Form.Item label='Selecciona a quién se le aplicará el acta: ' name='empleado'>
                            <Select placeholder="Selecciona un nombre" style={{ width: "100%", marginBottom: 16 }}
                                options={areaUsers.map((user) => ({
                                    value: `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno}`,
                                    label: `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno}`,
                                }))}
                                onChange={(value) => handleChange("empleado", value)}
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }

                            />
                        </Form.Item>
                        {/* --------------------------------------------------------------------------------------------------------------- */}
                        <Form.Item label='Ingresa la fecha en la que ocurrió el inicidente:' name='fecha_suceso'>
                            <DatePicker style={{ width: "100%" }} onChange={(date, dateString) => handleChange("fecha_suceso", dateString)} />
                        </Form.Item>
                        {/* --------------------------------------------------------------------------------------------------------------- */}
                        <Form.Item label='Ingresa el área de quien cometió la falta:' name='area'>
                            <Select
                                options={opciones}
                                onChange={(value) => handleChange("area", value)} />
                        </Form.Item>
                        {/* --------------------------------------------------------------------------------------------------------------- */}


                    </Form>
                    <Button onClick={generarPDF} loading={isLoading}>
                        {isLoading ? "Generando PDF..." : "Descargar PDF"}
                    </Button>
                </Card>
            </Col>
            <Col span={12}>
                <Card title="Previsualización del PDF" bordered={false} style={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)", margin: "auto", textAlign: 'center' }} >
                    <div style={{ flex: 1 }}>
                        {pdfUrl ? (
                            <iframe
                                src={pdfUrl}
                                width="100%"
                                height="600px"
                                title="Previsualización del PDF"
                            ></iframe>
                        ) : (
                            <p>No hay previsualización disponible.</p>
                        )}
                    </div>
                </Card>

            </Col>
        </Row >
    );
};

export default PDFEditor;
