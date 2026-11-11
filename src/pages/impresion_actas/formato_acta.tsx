import React, { useState, useEffect } from 'react';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { useLocation } from "react-router-dom";
import {
    Form, Card, Select, DatePicker, Button, Row, Col, Input, AutoComplete, Checkbox, Divider, Typography, message, Space,
} from "antd";
import { CheckOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { opciones } from '../alta_usuarios/users_form';
import axios from 'axios';

const { Title } = Typography;
const { TextArea } = Input;

const PDF_BASE = "/4-RH-14 R3 Acta Administrativa AR.pdf";
const PAGE_HEIGHT = 792;

const SEDES: Record<string, { label: string; sede: string; ciudad: string; domicilio: string }> = {
    juan_manuel: { label: "Juan Manuel", sede: "Juan Manuel", ciudad: "Guadalajara, Jalisco", domicilio: "Juan Manuel 1401, Col. Americana, Villaseñor, CP 44600, Guadalajara, Jalisco" },
    "8_de_julio": { label: "8 de Julio", sede: "8 de Julio (Matriz)", ciudad: "Guadalajara, Jalisco", domicilio: "Av. 8 de Julio 1626, Col. Morelos, CP 44910, Guadalajara, Jalisco" },
    españoles: { label: "Españoles", sede: "Españoles", ciudad: "San Pedro Tlaquepaque, Jalisco", domicilio: "Españoles 91, La Duraznera, San Pedro Tlaquepaque, Jalisco" },
    cdmx: { label: "CDMX", sede: "CDMX", ciudad: "Azcapotzalco, CDMX", domicilio: "Hacienda Escolástica #131, Hacienda del Rosario, Azcapotzalco, CDMX" },
    mty: { label: "Monterrey", sede: "Monterrey", ciudad: "Monterrey, Nuevo León", domicilio: "Vicente Suarez 962, Col. Obrera, Monterrey, Nuevo León" },
    ocotlan: { label: "Ocotlán", sede: "Ocotlán", ciudad: "Ocotlán, Jalisco", domicilio: "Noviembre 187 A, Col. Pedro Moreno, Ocotlán, Jalisco" },
    aldama: { label: "Aldama", sede: "Aldama", ciudad: "Zapopan, Jalisco", domicilio: "C. Aldama 679, El Mante, CP 45235, Zapopan, Jalisco" },
};

const MOTIVOS = [
    { value: "permiso_personal", label: "Permiso personal" },
    { value: "solicitud_especial", label: "Solicitud especial" },
    { value: "incidencia", label: "Incidencia conductual / Reporte" },
    { value: "retardo", label: "Retardo / Llegada tardía" },
    { value: "inasistencia", label: "Inasistencia injustificada" },
    { value: "incumplimiento", label: "Incumplimiento del reglamento" },
    { value: "otro", label: "Otro" },
];

const ASUNTOS = [
    "Reporte de actitud (irresponsabilidad, acciones negativas, daños, etc).",
    "Permiso de llegada tarde por asuntos personales.",
    "Permiso de inasistencia a cuenta de vacaciones.",
    "Permiso de salida temprano.",
    "Llegada tarde no justificada.",
    "Permiso de llegada tarde por cita médica (IMSS).",
    "Falta justificada de acuerdo al Reglamento Interior de Trabajo.",
    "Falta injustificada.",
    "Permiso tiempo x tiempo controlado",
    "Falta por incapacidad del IMSS.",
    "Permiso de inasistencia sin goce de sueldo.",
].map((value) => ({ value }));

// Coordenadas (pt) del formato 4-RH-14 R3: x desde la izquierda, y desde el borde superior (línea base)
const CHECKBOX_POS: Record<string, { x: number; y: number }> = {
    permiso_personal: { x: 43, y: 309 },
    solicitud_especial: { x: 137, y: 309 },
    incidencia: { x: 230, y: 309 },
    retardo: { x: 386, y: 309 },
    inasistencia: { x: 43, y: 321 },
    incumplimiento: { x: 166, y: 321 },
    otro: { x: 322, y: 321 },
};

type ActaValues = {
    sucursal: string;
    fecha_elaboracion: string; // YYYY-MM-DD HH:mm
    area: string;
    empleado: string;
    puesto: string;
    elabora: string;
    cargo: string;
    motivos: string[];
    otro_motivo: string;
    asunto: string;
    fecha_evento: string;
    lugar: string;
    hechos: string;
    declaracion: string;
    respuesta: string;
    accion: string;
    responsable: string;
    fecha_limite: string;
    observaciones: string;
    jefe: string;
};

const initialActaValues: ActaValues = {
    sucursal: 'españoles',
    fecha_elaboracion: '',
    area: '',
    empleado: '',
    puesto: '',
    elabora: '',
    cargo: '',
    motivos: [],
    otro_motivo: '',
    asunto: '',
    fecha_evento: '',
    lugar: '',
    hechos: '',
    declaracion: '',
    respuesta: '',
    accion: '',
    responsable: '',
    fecha_limite: '',
    observaciones: '',
    jefe: '',
};

const formatearFecha = (fechaStr: string): string => {
    if (!fechaStr) return "";
    const d = dayjs(fechaStr);
    return d.isValid() ? `${d.date()} de ${MESES[d.month()]}, ${d.year()}` : fechaStr;
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const formatearFechaHora = (fechaStr: string): string => {
    const d = dayjs(fechaStr);
    return fechaStr && d.isValid() ? `${formatearFecha(fechaStr)}, ${d.format("HH:mm")} hrs` : fechaStr;
};

const formatearArea = (area: string) => (area || "").replace(/_/g, " ").toUpperCase();

// Helvetica (WinAnsi) no soporta todos los caracteres; se sustituyen los no soportados
const limpiar = (t: string) => (t || "").replace(/\t/g, " ").replace(/[^\x20-\xFF\n]/g, "?");

const ajustarTamano = (font: PDFFont, texto: string, size: number, maxWidth: number, minSize = 6) => {
    let s = size;
    while (s > minSize && font.widthOfTextAtSize(texto, s) > maxWidth) s -= 0.5;
    return s;
};

const partirLineas = (font: PDFFont, texto: string, size: number, maxWidth: number): string[] => {
    const lineas: string[] = [];
    limpiar(texto).split("\n").forEach((parrafo) => {
        let actual = "";
        parrafo.split(/\s+/).filter(Boolean).forEach((palabra) => {
            const prueba = actual ? `${actual} ${palabra}` : palabra;
            if (font.widthOfTextAtSize(prueba, size) <= maxWidth) {
                actual = prueba;
            } else {
                if (actual) lineas.push(actual);
                actual = palabra;
            }
        });
        lineas.push(actual);
    });
    return lineas;
};

// Edita libremente y solo aplica el valor (y actualiza el PDF) al confirmar con el check o Enter
const ConfirmInput = ({ value, onChange, onCommit, rows }: {
    value?: string;
    onChange?: (v: string) => void;
    onCommit: (v: string) => void;
    rows?: number;
}) => {
    const [aplicado, setAplicado] = useState(value ?? "");
    const actual = value ?? "";
    const pendiente = actual !== aplicado;
    const confirmar = () => { setAplicado(actual); onCommit(actual); };
    const boton = (
        <Button
            type={pendiente ? "primary" : "default"}
            icon={<CheckOutlined />}
            onClick={confirmar}
            disabled={!pendiente}
            title="Aplicar al PDF"
        />
    );
    return rows ? (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <TextArea rows={rows} value={actual} onChange={(e) => onChange?.(e.target.value)} />
            {boton}
        </div>
    ) : (
        <Space.Compact style={{ width: "100%" }}>
            <Input value={actual} onChange={(e) => onChange?.(e.target.value)} onPressEnter={confirmar} />
            {boton}
        </Space.Compact>
    );
};

export const PDFEditor = () => {
    const location = useLocation();
    const formData = location.state || {};
    const [isLoading, setIsLoading] = useState(false);
    const [jefesInmediatos, setJefesInmediatos] = useState<{ id: number; nombre: string; area: string }[]>([]);
    const [areaUsers, setAreaUsers] = useState<any[]>([]);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [actaValues, setActaValues] = useState<ActaValues>({
        ...initialActaValues,
        empleado: formData.nombre_emisor || '',
        area: formData.area || '',
        hechos: formData.info_registro || '',
    });
    const [form] = Form.useForm();

    useEffect(() => {
        axios.get("https://desarrollotecnologicoar.com/api3/lideres_inmediatos/")
            .then(({ data }) => setJefesInmediatos(data ?? []))
            .catch(() => message.error("Error al cargar líderes inmediatos."));
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) return;
            try {
                const q = query(collection(db, "usuarios"), where("correo", "==", user.email));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const u: any = snap.docs[0].data();
                    const nombre = [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(" ");
                    const cargo = u.puesto || u.rol || "";
                    setActaValues((prev) => ({ ...prev, elabora: prev.elabora || nombre, cargo: prev.cargo || cargo }));
                    form.setFieldsValue({ elabora: nombre, cargo });
                } else {
                    message.error("No se encontró información del usuario.");
                }
                const all = await getDocs(query(collection(db, "usuarios")));
                setAreaUsers(all.docs.map((d) => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Error al obtener datos del usuario:", error);
                message.error("Error al cargar los datos del usuario.");
            }
        });
        return () => unsubscribe();
    }, [form]);

    useEffect(() => {
        form.setFieldsValue({
            empleado: actaValues.empleado || undefined,
            area: actaValues.area || undefined,
            hechos: actaValues.hechos,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const dibujar = async (pdfDoc: PDFDocument, v: ActaValues) => {
        const [p1, p2] = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const sede = SEDES[v.sucursal];
        const color = rgb(0.05, 0.1, 0.55);

        const texto = (page: PDFPage, valor: string, x: number, y: number, maxWidth: number, size = 9) => {
            const t = limpiar(valor).replace(/\n/g, " ");
            if (!t) return;
            const s = ajustarTamano(font, t, size, maxWidth);
            page.drawText(t, { x, y: PAGE_HEIGHT - y + 1, size: s, font, color });
        };

        // Bloque multilínea sobre renglones ya impresos; reduce el tamaño y, si aun así no cabe, recorta
        const parrafo = (page: PDFPage, valor: string, x: number, ys: number[], maxWidth: number) => {
            if (!valor.trim()) return;
            let size = 9;
            let lineas = partirLineas(font, valor, size, maxWidth);
            while (lineas.length > ys.length && size > 6.5) {
                size -= 0.5;
                lineas = partirLineas(font, valor, size, maxWidth);
            }
            if (lineas.length > ys.length) {
                lineas = lineas.slice(0, ys.length);
                lineas[ys.length - 1] = lineas[ys.length - 1].replace(/.{0,3}$/, "...");
            }
            lineas.forEach((l, i) => page.drawText(l, { x, y: PAGE_HEIGHT - ys[i] + 1, size, font, color }));
        };

        const fechaElab = v.fecha_elaboracion ? dayjs(v.fecha_elaboracion) : null;

        // 1. Datos del registro
        texto(p1, formatearFecha(v.fecha_elaboracion), 146, 163, 245);
        texto(p1, fechaElab ? fechaElab.format("HH:mm") : "", 431, 163, 95);
        texto(p1, sede?.sede ?? "", 125, 178, 170);
        texto(p1, sede?.ciudad ?? "", 385, 178, 140);
        if (sede) parrafo(p1, sede.domicilio, 161, [193, 208], 360);
        texto(p1, formatearArea(v.area), 145, 223, 340);
        texto(p1, v.empleado, 160, 238, 330);
        texto(p1, v.puesto, 81, 253, 260);
        texto(p1, v.elabora, 197, 268, 320);
        texto(p1, v.cargo, 116, 283, 225);

        v.motivos.forEach((m) => {
            const pos = CHECKBOX_POS[m];
            if (pos) p1.drawText("X", { x: pos.x + 1.5, y: PAGE_HEIGHT - pos.y + 0.5, size: 9, font: bold, color });
        });
        if (v.motivos.includes("otro")) texto(p1, v.otro_motivo, 354, 321, 174);
        texto(p1, v.asunto, 123, 335, 400);

        // 2. Descripción
        texto(p1, formatearFechaHora(v.fecha_evento), 241, 367, 258);
        texto(p1, v.lugar, 153, 382, 348);
        parrafo(p1, v.hechos, 45, [427, 452, 476], 480);

        // 3. Declaración del colaborador
        parrafo(p1, v.declaracion, 45, [533, 557, 582], 476);

        // 4. Respuesta de la empresa y acuerdos
        parrafo(p1, v.respuesta, 45, [638, 663], 476);
        texto(p1, v.accion, 46, 722, 305, 8);
        texto(p1, v.responsable, 363, 722, 110, 8);
        texto(p1, formatearFecha(v.fecha_limite), 481, 722, 80, 8);

        // 5. Observaciones y firmas
        const lineasObs = partirLineas(font, v.observaciones, 9, 400);
        if (lineasObs[0]) texto(p2, lineasObs[0], 116, 76, 400);
        if (lineasObs.length > 1) parrafo(p2, lineasObs.slice(1).join(" "), 45, [98], 470);
        texto(p2, v.jefe, 82, 193, 165);
        texto(p2, v.empleado, 352, 193, 165);
    };

    const construirPdf = async (): Promise<Uint8Array> => {
        const res = await fetch(PDF_BASE);
        if (!res.ok) throw new Error("Error al cargar el PDF base.");
        const pdfDoc = await PDFDocument.load(await res.arrayBuffer());
        await dibujar(pdfDoc, actaValues);
        return pdfDoc.save();
    };

    useEffect(() => {
        let url: string | null = null;
        let cancelado = false;
        construirPdf()
            .then((bytes) => {
                if (cancelado) return;
                url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
                setPdfUrl(url);
            })
            .catch((e) => console.error("Error al generar el PDF:", e));
        return () => {
            cancelado = true;
            if (url) setTimeout(() => URL.revokeObjectURL(url as string), 1000);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actaValues]);

    const descargar = async () => {
        try {
            setIsLoading(true);
            const bytes = await construirPdf();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
            link.download = `Acta_${(actaValues.empleado || "sin_nombre").replace(/\s+/g, "_")}_${actaValues.fecha_elaboracion.slice(0, 10) || "sin_fecha"}.pdf`;
            link.click();
            message.success("PDF generado exitosamente.");
        } catch (error) {
            console.error("Error al generar el PDF:", error);
            message.error("Hubo un error al generar el PDF. Por favor, inténtalo nuevamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const set = (campos: Partial<ActaValues>) => setActaValues((prev) => ({ ...prev, ...campos }));

    const nombresUsuarios = areaUsers.map((u) => {
        const nombre = [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(" ");
        return { value: nombre, label: nombre, puesto: u.puesto || u.rol || "", area: u.area || "" };
    });

    const filtrar = (input: string, option?: { label?: unknown }) =>
        String(option?.label ?? "").toLowerCase().includes(input.toLowerCase());

    return (
        <Row gutter={[16, 16]} style={{ padding: 24 }}>
            <Col xs={24} md={12}>
                <Card
                    title="GENERAR ACTA ADMINISTRATIVA"
                    bordered={false}
                    style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}
                >
                    <Form form={form} layout="vertical" initialValues={{ sucursal: actaValues.sucursal }}>
                        <Title level={5}>1. Datos del registro</Title>
                        <Form.Item label="Sede / sucursal" name="sucursal">
                            <Select
                                options={Object.entries(SEDES).map(([value, s]) => ({ value, label: `${s.label} — ${s.domicilio}` }))}
                                onChange={(value) => set({ sucursal: value })}
                            />
                        </Form.Item>
                        <Form.Item label="Fecha y hora de elaboración" name="fecha_elaboracion">
                            <DatePicker
                                style={{ width: "100%" }}
                                showTime
                                format="DD/MM/YYYY HH:mm"
                                onChange={(d) => set({ fecha_elaboracion: d ? d.format("YYYY-MM-DD HH:mm") : "" })}
                            />
                        </Form.Item>
                        <Form.Item label="Nombre del colaborador" name="empleado">
                            <Select
                                showSearch
                                placeholder="Selecciona un nombre"
                                options={nombresUsuarios}
                                filterOption={filtrar}
                                onChange={(value, option: any) => {
                                    const area = option?.area || actaValues.area;
                                    set({ empleado: value, puesto: option?.puesto || "", area });
                                    form.setFieldsValue({ puesto: option?.puesto || "", area: area || undefined });
                                }}
                            />
                        </Form.Item>
                        <Row gutter={12}>
                            <Col xs={24} sm={12}>
                                <Form.Item label="Área / Departamento" name="area">
                                    <Select options={opciones} onChange={(value) => set({ area: value })} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item label="Puesto del colaborador" name="puesto">
                                    <ConfirmInput onCommit={(v) => set({ puesto: v })} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item label="Nombre de quien elabora el acta" name="elabora">
                                    <ConfirmInput onCommit={(v) => set({ elabora: v })} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item label="Cargo / Puesto de quien elabora" name="cargo">
                                    <ConfirmInput onCommit={(v) => set({ cargo: v })} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item label="Motivo de la diligencia" name="motivos">
                            <Checkbox.Group options={MOTIVOS} onChange={(values) => set({ motivos: values as string[] })} />
                        </Form.Item>
                        {actaValues.motivos.includes("otro") && (
                            <Form.Item label="Otro motivo" name="otro_motivo">
                                <ConfirmInput onCommit={(v) => set({ otro_motivo: v })} />
                            </Form.Item>
                        )}
                        <Form.Item label="Asunto principal" name="asunto">
                            <AutoComplete options={ASUNTOS} onChange={(value) => set({ asunto: value })} placeholder="Selecciona o escribe el asunto" />
                        </Form.Item>

                        <Divider />
                        <Title level={5}>2. Descripción de los hechos o la solicitud</Title>
                        <Form.Item label="Fecha, hora y periodo del evento / solicitud" name="fecha_evento">
                            <DatePicker
                                style={{ width: "100%" }}
                                showTime
                                format="DD/MM/YYYY HH:mm"
                                onChange={(d) => set({ fecha_evento: d ? d.format("YYYY-MM-DD HH:mm") : "" })}
                            />
                        </Form.Item>
                        <Form.Item label="Lugar o área implicada" name="lugar">
                            <ConfirmInput onCommit={(v) => set({ lugar: v })} />
                        </Form.Item>
                        <Form.Item label="Hechos (cronológico; distingue lo verificado de lo reportado)" name="hechos">
                            <ConfirmInput rows={4} onCommit={(v) => set({ hechos: v })} />
                        </Form.Item>

                        <Divider />
                        <Title level={5}>3. Declaración del colaborador</Title>
                        <Form.Item name="declaracion">
                            <ConfirmInput rows={3} onCommit={(v) => set({ declaracion: v })} />
                        </Form.Item>

                        <Divider />
                        <Title level={5}>4. Respuesta de la empresa y acuerdos</Title>
                        <Form.Item label="Respuesta / determinación" name="respuesta">
                            <ConfirmInput rows={3} onCommit={(v) => set({ respuesta: v })} />
                        </Form.Item>
                        <Form.Item label="Acción o compromiso pactado" name="accion">
                            <ConfirmInput onCommit={(v) => set({ accion: v })} />
                        </Form.Item>
                        <Row gutter={12}>
                            <Col xs={24} sm={12}>
                                <Form.Item label="Responsable" name="responsable">
                                    <ConfirmInput onCommit={(v) => set({ responsable: v })} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item label="Fecha límite de revisión" name="fecha_limite">
                                    <DatePicker
                                        style={{ width: "100%" }}
                                        format="DD/MM/YYYY"
                                        onChange={(d) => set({ fecha_limite: d ? d.format("YYYY-MM-DD") : "" })}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider />
                        <Title level={5}>5. Observaciones y firmas</Title>
                        <Form.Item label="Observaciones" name="observaciones">
                            <ConfirmInput rows={2} onCommit={(v) => set({ observaciones: v })} />
                        </Form.Item>
                        <Form.Item label="Jefe inmediato / Superior jerárquico" name="jefe">
                            <Select
                                showSearch
                                options={jefesInmediatos.map((j) => ({ value: j.nombre, label: `${j.nombre} - ${formatearArea(j.area)}` }))}
                                filterOption={filtrar}
                                onChange={(value) => set({ jefe: value })}
                            />
                        </Form.Item>
                    </Form>
                    <Button type="primary" onClick={descargar} loading={isLoading} block>
                        {isLoading ? "Generando PDF..." : "Descargar PDF"}
                    </Button>
                </Card>
            </Col>
            <Col xs={24} md={12}>
                <Card
                    title="Previsualización del PDF"
                    bordered={false}
                    style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)", position: "sticky", top: 80 }}
                >
                    {pdfUrl ? (
                        <iframe src={pdfUrl} width="100%" height="700px" title="Previsualización del PDF" />
                    ) : (
                        <p>No hay previsualización disponible.</p>
                    )}
                </Card>
            </Col>
        </Row>
    );
};

export default PDFEditor;
