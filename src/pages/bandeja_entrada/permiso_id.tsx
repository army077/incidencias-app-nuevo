import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button, Spin, message, Typography, Tag, Space, Modal, Form, Input, DatePicker, Select, Upload, Avatar, theme } from "antd";
import { UploadOutlined, UserOutlined, TeamOutlined, FileTextOutlined, MessageOutlined } from "@ant-design/icons";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import axios from "axios";
import { auth } from "../../firebaseConfig";
import dayjs from "dayjs";
const { Text, Title } = Typography;
import moment from "moment";

const iniciales = (nombre: string) =>
  (nombre || "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");

const Seccion: React.FC<{ icono: React.ReactNode; titulo: string; children: React.ReactNode }> = ({ icono, titulo, children }) => {
  const { token } = theme.useToken();
  return (
    <div style={{ background: token.colorFillAlter, borderRadius: 12, padding: 16 }}>
      <Space size={8} style={{ marginBottom: 12 }}>
        {icono}
        <Text strong style={{ fontSize: 16 }}>{titulo}</Text>
      </Space>
      <Space direction="vertical" size={10} style={{ width: "100%" }}>{children}</Space>
    </div>
  );
};

const Dato: React.FC<{ etiqueta: string; valor: React.ReactNode }> = ({ etiqueta, valor }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
    <Text type="secondary" style={{ textTransform: "capitalize" }}>{etiqueta}</Text>
    <Text style={{ textAlign: "right" }}>{valor}</Text>
  </div>
);

interface Permiso {
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
  fecha_permiso: string;
  motivo_rechazado: string;
  correo_lider?: string;
}

export const DetallePermiso = () => {
  const camposMostrados = [
    "id", "nombre_completo", "correo", "area", "jefe_inmediato", "fecha_solicitud",
    "fecha_permiso", "tipo_permiso", "urgencia", "comentarios", "status", "motivo_rechazado", "correo_lider",
  ];
  const { id } = useParams<{ id: string }>(); // Obtener ID de la URL
  const navigate = useNavigate(); // Navegar entre rutas
  const [loading, setLoading] = useState(true); // Estado de carga
  const [permiso, setPermiso] = useState<Permiso | null>(null); // Estado del permiso
  const [tipoRegistro, setTipoRegistro] = useState<string | undefined>("");
  const [user, setUser] = useState<any>(null); // Usuario autenticado
  const [isModalVisible, setIsModalVisible] = useState(false); // Control del modal
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [nuevoStatus, setNuevoStatus] = useState<string>(""); // Estado del nuevo status
  const [rechazoComentarios, setRechazoComentarios] = useState<string>("");
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [form] = Form.useForm(); // Crear una instancia del formulario
  const [okButtonDisabled, setOkButtonDisabled] = useState(true);

  // Función para obtener los datos del permiso
  const fetchPermiso = async () => {
    try {
      const response = await axios.get(
        `https://desarrollotecnologicoar.com/api3/permisos/${id}`
      );
      setPermiso(response.data); // Guardamos el permiso
    } catch (error) {
      console.error("Error al obtener el permiso:", error);
      message.error("Hubo un error al cargar el permiso.");
    } finally {
      setLoading(false); // Terminamos la carga
    }
  };

  // useEffect para cargar los datos al montar el componente
  useEffect(() => {
    fetchPermiso();
  }, [id]);

  const handleFormChange = (changedValues: any, allValues: any) => {
    if (changedValues.tipo_registro) {
      setTipoRegistro(changedValues.tipo_registro);
    }

    // Campos requeridos: calculados directamente, sin validateFields async (evita condiciones de carrera)
    const tipo = allValues.tipo_registro;
    const infoRegistro = (allValues.info_registro ?? "").trim();
    const requiereActa = tipo && ["Mala actitud", "Falta injustificada."].includes(tipo);

    if (requiereActa && !fileToUpload) {
      setOkButtonDisabled(true);
    } else {
      setOkButtonDisabled(!tipo || !infoRegistro);
    }
  };

  // El <Upload> no está enlazado a un Form.Item, así que subir el archivo no dispara onValuesChange; se recalcula aquí
  useEffect(() => {
    const allValues = form.getFieldsValue();
    const tipo = allValues.tipo_registro;
    const infoRegistro = (allValues.info_registro ?? "").trim();
    const requiereActa = tipo && ["Mala actitud", "Falta injustificada."].includes(tipo);

    if (requiereActa && !fileToUpload) {
      setOkButtonDisabled(true);
    } else {
      setOkButtonDisabled(!tipo || !infoRegistro);
    }
  }, [fileToUpload]);

  // Validar datos del usuario
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user); // Guardar el usuario autenticado
      } else {
        message.error("Usuario no autenticado");
        navigate("/login");
      }
    });

    return () => unsubscribe(); // Limpiar el listener
  }, [navigate]);



  const showModal = (status: string) => {
    setNuevoStatus(status); // Guardamos el nuevo status (Aprobado o Rechazado)
    if (permiso && user) {
      form.setFieldsValue({

        persona_emisor: user.displayName || user.email,
        nombre_emisor: permiso.nombre_completo,
        jefe_inmediato: permiso.jefe_inmediato,
        area: permiso.area,
        fecha_permiso: permiso.fecha_permiso
          ? permiso.fecha_permiso.substring(0, 10)
          : ""
      });
    }
    setIsModalVisible(true); // Mostrar el modal
  };

  const showModalRechazo = (status: string) => {
    setNuevoStatus(status);
    if (permiso && user) {
      form.setFieldsValue({
        motivo_rechazado: ""
      });
    }
    setIsRejectModalVisible(true);
  };

  const handleCancel = () => setIsModalVisible(false); // Cerrar el modal
  const handleRejectCancel = () => setIsRejectModalVisible(false);

  // Función para enviar el formulario
  const handleOk = async () => {
    try {
      const values = await form.validateFields(); // Validar los campos del formulario
      console.log("Valores del formulario:", values);

      // Llamada a la API para actualizar el estado
      await axios.put(
        `https://desarrollotecnologicoar.com/api3/actualizar_status/${id}`,
        { status: nuevoStatus, ...values }
      );
      message.success(`El permiso ha sido ${nuevoStatus.toLowerCase()} correctamente.`);
      navigate("/bandeja_entrada"); // Redirigir a la bandeja
    } catch (error) {
      console.error("Error al actualizar el permiso:", error);
      message.error("Hubo un error al actualizar el permiso.");
    }
    try {
      const values = await form.validateFields(); // Validar los campos del formulario
      console.log("Valores del formulario:", values);
      await axios.post(`https://desarrollotecnologicoar.com/api3/incidencias`, values);
      message.success("El permiso se ha registrado correctamente.");
      navigate("/bandeja_entrada");
    } catch (error) {
      console.error("Error al enviar el formulario:", error);
      
    }


  };
  // Modal para confirmar el rechazo
  const confirmRejection = async () => {
    try {
      const values = await form.validateFields();
      await axios.put(
        `https://desarrollotecnologicoar.com/api3/actualizar_status/${id}`,
        {
          status: "Rechazado",
          motivo_rechazado: values.motivo_rechazado
        }
      );
      message.success("El permiso ha sido rechazado.");
      navigate("/bandeja_entrada");
    } catch (error) {
      console.error("Error al rechazar el permiso:", error);
      message.error("Hubo un error al rechazar el permiso.");
    }
  };

  if (loading) {
    return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  }

  if (!permiso) {
    return <div>No se encontró el permiso.</div>;
  }

  return (
    <Card
      bordered={false}
      style={{ width: "100%", maxWidth: 640, margin: "24px auto", borderRadius: 16, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}
      bodyStyle={{ padding: 16 }}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Title level={4} style={{ margin: 0 }}>Solicitud #{permiso.id}</Title>

        <Seccion icono={<UserOutlined />} titulo="Datos del colaborador">
          <Space align="center" size={12}>
            <Avatar size={44} style={{ backgroundColor: "#1677ff" }}>{iniciales(permiso.nombre_completo)}</Avatar>
            <div>
              <Text strong style={{ fontSize: 16 }}>{permiso.nombre_completo}</Text>
              <br />
              <Text type="secondary">{permiso.correo}</Text>
            </div>
          </Space>
          <Dato etiqueta="Área" valor={permiso.area ? permiso.area.replace(/_/g, " ").toUpperCase() : "-"} />
        </Seccion>

        <Seccion icono={<TeamOutlined />} titulo="Datos del líder">
          <Dato etiqueta="Jefe inmediato" valor={permiso.jefe_inmediato || "-"} />
          {permiso.correo_lider && <Dato etiqueta="Correo líder" valor={permiso.correo_lider} />}
        </Seccion>

        <Seccion icono={<FileTextOutlined />} titulo="Datos del permiso">
          <Dato etiqueta="Tipo de permiso" valor={permiso.tipo_permiso} />
          <Dato
            etiqueta="Urgencia"
            valor={<Tag color={permiso.urgencia ? "red" : "green"} style={{ margin: 0 }}>{permiso.urgencia ? "Urgente" : "No Urgente"}</Tag>}
          />
          <Dato etiqueta="Fecha de solicitud" valor={moment(permiso.fecha_solicitud).format("DD/MM/YYYY HH:mm")} />
          {permiso.motivo_rechazado && <Dato etiqueta="Motivo de rechazo" valor={permiso.motivo_rechazado} />}
          {Object.entries(permiso)
            .filter(([key, value]) => !camposMostrados.includes(key) && value !== null && value !== "" && typeof value !== "object")
            .map(([key, value]) => (
              <Dato key={key} etiqueta={key.replace(/_/g, " ")} valor={String(value)} />
            ))}
          <Dato
            etiqueta="Fecha del permiso"
            valor={permiso.fecha_permiso ? moment(permiso.fecha_permiso.substring(0, 10), "YYYY-MM-DD").format("DD/MM/YYYY") : "-"}
          />
          <Dato
            etiqueta="Status actual"
            valor={
              <Tag
                style={{ margin: 0 }}
                color={permiso.status === "Pendiente" ? "orange" : permiso.status === "Aprobado" ? "green" : "red"}
              >
                {permiso.status}
              </Tag>
            }
          />
        </Seccion>

        <Seccion icono={<MessageOutlined />} titulo="Comentarios">
          {(permiso.comentarios || "-").split("\n").map((linea, i) => (
            <div key={i}>
              <span
                style={{
                  background: "rgba(250, 173, 20, 0.35)",
                  borderRadius: 6,
                  padding: "2px 6px",
                  boxDecorationBreak: "clone",
                  WebkitBoxDecorationBreak: "clone",
                  lineHeight: 1.8,
                }}
              >
                {linea}
              </span>
            </div>
          ))}
        </Seccion>

        <Space size="middle" wrap>
          <Button
            type="primary"
            onClick={() => showModal("Aprobado")}
            disabled={permiso.status === "Aprobado"}
          >
            Aprobar Permiso
          </Button>
          <Button
            danger
            onClick={() => showModalRechazo("Rechazado")}
            disabled={permiso.status === "Rechazado"}
          >
            Rechazar Permiso
          </Button>
        </Space>
      </Space>

      <Modal
        title="Confirmar Cambio de Permiso"
        visible={isModalVisible}
        onOk={handleOk}
        okButtonProps={{disabled: okButtonDisabled}} 
        onCancel={handleCancel}
        width={800}
      >
        <Form form={form} layout="vertical" onValuesChange={handleFormChange}>

          <Form.Item label="Persona Emisora" name="persona_emisor">
            <Input disabled />
          </Form.Item>

          <Form.Item label="Nombre Emisor" name="nombre_emisor">
            <Input disabled />
          </Form.Item>

          <Form.Item label="Jefe Inmediato" name="jefe_inmediato">
            <Input disabled />
          </Form.Item>

          <Form.Item label="Tipo de Registro" name="tipo_registro" rules={[{ required: true, message: 'Campo requerido' }]} >
            <Select options={[
              { value: "Mala actitud", label: "Reporte de actitud (irresponsabilidad, acciones negativas, daños, etc)." },
              { value: "Permiso de llegada tarde", label: "Permiso de llegada tarde por asuntos personales." },
              { value: "Permiso de inasistencia a cuenta de vacaciones.", label: "Permiso de inasistencia a cuenta de vacaciones." },
              { value: "Permiso de salida temprano.", label: "Permiso de salida temprano." },
              {value: "Permiso de home office",label: "Permiso de home office"},
              {value: "Retardo", label: "Retardo"},
              { value: "Permiso de llegada tarde por cita médica (IMSS).", label: "Permiso de llegada tarde por cita médica (IMSS)." },
              { value: "Falta justificada de acuerdo al Reglamento Interior de Trabajo.", label: "Falta justificada de acuerdo al Reglamento Interior de Trabajo." },
              { value: "Falta injustificada.", label: "Falta injustificada." },
              { value: "Permiso tiempo x tiempo controlado", label: "Permiso tiempo x tiempo controlado" },
              { value: "Permiso para cambio de horario temporal", label: "Permiso para cambio de horario temporal" },
              { value: "Falta por incapacidad del IMSS.", label: "Falta por incapacidad del IMSS." },
              { value: "Permiso de inasistencia sin goce de sueldo.", label: "Permiso de inasistencia sin goce de sueldo." },
              { value: "Reconocimiento al desempeño", label: "Reconocimiento al desempeño" },
            ]} />
          </Form.Item>

          <Form.Item label="Fecha del Permiso" name="fecha_permiso">
            <Input disabled />
          </Form.Item>

          <Form.Item label="Información del Registro" name="info_registro" rules={[{ required: true, message: 'Campo requerido' }]}>
            <Input.TextArea rows={5} />
          </Form.Item>

          {/* <Form.Item label="Status del Acta" name="status_acta" rules={[{ required: true, message: 'Campo requerido' }]}>
            <Select options={[
              { value: "Favor de emitir", label: "Favor de emitir" },
              { value: "Emitida y firmada (enviada a RH)", label: "Emitida y firmada (enviada a RH)" },
              { value: "Emitida y firmada (pendiente de enviarse a RH)", label: "Emitida y firmada (pendiente de enviarse a RH)" },
              { value: "Emitida y en espera de recabar firmas", label: "Emitida y en espera de recabar firmas" },

            ]} />
          </Form.Item> */}


          <Form.Item label="Área" name="area">
            <Input disabled />
          </Form.Item>

          {(tipoRegistro === "Mala actitud" || tipoRegistro === "Falta injustificada.") && (
            <Form.Item
              label="Confirme la emisión física del Acta Administrativa:"
              name="status_acta"
              initialValue="Emitida y pendiente de firmar"
              rules={[{ required: false, message: "El campo Status del Acta es obligatorio" }]}
            >
              <Select
                options={[
                  { value: "Emitida y pendiente de firmar", label: "Emitida y pendiente de firmar" },
                  { value: "Emitida y pendiente de envío", label: "Emitida y pendiente de envío físico" },
                  { value: "Emitida y firmada", label: "Emitida y firmada" },
                ]}
              />
            </Form.Item>
          )}
          {(tipoRegistro === "Mala actitud" || tipoRegistro === "Falta injustificada.") && (
              <>
                <Form.Item>
                  <a
                    onClick={() => navigate("/impresion_acta")}
                    style={{ color: "#1890ff", cursor: "pointer" }}
                  >
                    ¿No cuentas con acta? Llénala aquí!
                  </a>
                </Form.Item>

                <Form.Item label="Subir Acta Administrativa">
                  <Upload
                    accept=".pdf,.jpg,.png,.jpeg"
                    beforeUpload={(file) => {
                      setFileToUpload(file); // Guardar archivo en el estado
                      return false; // Prevenir la subida automática
                    }}
                    showUploadList={true}
                  >
                    <Button icon={<UploadOutlined />}>Seleccionar archivo</Button>
                  </Upload>
                </Form.Item>
              </>
            )
          }





        </Form>
      </Modal>

      <Modal
        title="Confirmar Rechazo"
        visible={isRejectModalVisible}
        onOk={confirmRejection}
        onCancel={handleRejectCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Escribe el motivo del rechazo"
            name="motivo_rechazado"
            rules={[{ required: true, message: "Por favor, escribe el motivo del rechazo." }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

    </Card>
  );
};
