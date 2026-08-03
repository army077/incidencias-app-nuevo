import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select, message, Button, Upload } from "antd";
import dayjs from "dayjs";
import { FormInstance } from "antd";
import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db, storage } from "../../firebaseConfig";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { UploadOutlined } from "@ant-design/icons";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
// import { usuariosPermitidos } from "../../user_config";

type FormValues = {
  persona_emisor: string;
  nombre_emisor: string | { value: string; label: string };
  jefe_inmediato: string;
  tipo_registro: string;
  fecha_permiso: any;
  info_registro: string;
  status_acta: string;
  area: string;
  downloadURL?: string; // Añadido
};

interface Incidencia {
  id: string;
  marca_temporal: string;
  persona_emisor: string;
  nombre_emisor: string;
  jefe_inmediato: string;
  tipo_registro: string;
  fecha_permiso: string;
  info_registro: string;
  status_acta: string;
  area: string;
}

interface UsuarioData {
  displayName: string;
  email: string;
  area: string;
}

type Lider = { id: number | string; nombre: string; correo: string };
type Gerentes = string[];


// export const jefesInmediatos = [
//   { value: "Luis Jaime Martínez Arredondo", label: "Luis Jaime Martínez Arredondo - Líder de Operaciones" },
//   { value: "Carlos Antonio Rivas Martínez", label: "Carlos Antonio Rivas Martínez - Líder de Soporte Técnico Call Center / NPI" },
//   { value: "Ana Rosa Lira Ortíz", label: "Ana Rosa Lira Ortíz - Líder de Logística" },
//   { value: "Armando de la Rosa García", label: "Armando de la Rosa García - Líder de Desarrollo Tecnológico  " },
//   { value: "Ma. del Refugio Arroyo", label: "Ma. del Refugio Arroyo - Gerente Contabilidad, Finanza y RRHH" },
//   { value: "Citlali Coseth De León", label: "Citlali Coseth De León - Jefe de Producción Láser" },
//   { value: "Omar Díaz", label: "Omar Díaz - Soporte Técnico Presencial" },
//   { value: "Laura Beatriz Arroyo Salcedo", label: "Laura Beatriz Arroyo Salcedo - Líder de Contabilidad" },
//   { value: "Esteban Ramírez", label: "Esteban Ramírez - Gerente General" },
//   { value: "Karen Ibarra Ramírez", label: "Karen Ibarra Ramírez - Encargada Ventas de Refacciones y Servicios" },
//   { value: "Ana Sánchez Murúa", label: "Ana Sánchez Murúa - Generalista RRHH" },
//   { value: "Esmeralda Ramírez Díaz", label: "Esmeralda Ramírez Díaz - Jefe de Crédito y Cobranza" },
//   { value: "Lucero Ávila Cortes", label: "Lucero Ávila Cortes - Gerente de Mercadotecnia" },
//   { value: "Alonso Saúl Sandoval López", label: "Alonso Saúl Sandoval López - Supervisor de Producción" },
//   { value: "Sergio Alejandro García Trejo", label: "Sergio Alejandro García Trejo - Jefe de Procesos y Calidad" },
//   { value: "Jaime Daniel Flores Hernández", label: "Jaime Daniel Flores Hernández - Supervisor de Calidad" },
//   { value: "Jorge Antonio Lías Lopez", label: "Jorge Antonio Lías Lopez - Analista de Seguridad e Higiene / Mantenimiento" },
//   { value: "Pablo Ramírez Diaque", label: "Pablo Ramírez Diaque - Gerente de Ingeniería" },
//   // { value: "Christian Mendoza Nepomuceno", label: "Christian Mendoza Nepomuceno - Jefe de Almacén" },
//   { value: "Gustavo Gallegos Cortés", label: "Gustavo Gallegos Cortés - Subjefe de Soporte Técnico Presencial / Encargado de Sucursal CDMX" },
//   { value: "Saúl Espinoza Silva", label: "Saúl Espinoza Silva - Encargado de Logística Internacional" },
//   { value: "Jared Guerra García", label: "Jared Guerra García - Jefe de Reparaciones" },
//   { value: 'Francisco Javier Hernandez Castro', label: 'Francisco Javier Hernández - Jefe de Almacén' }
// ];

export const BlogPostCreate = () => {
  const { formProps, saveButtonProps, form } = useForm<FormValues>();
  const [userData, setUserData] = useState<Partial<FormValues>>({});
  const [loading, setLoading] = useState(true); // Estado para mostrar carga inicial
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null); // Usuario seleccionado
  const [tipoRegistro, setTipoRegistro] = useState<string | undefined>(); // Estado para el tipo de registro
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [jefesInmediatos, setJefesInmediatos] = useState<any[]>([]);
  const [usuariosPermitidos, setUsuariosPermitidos] = useState<string[]>([]);
  const [loadingGerentes, setLoadingGerentes] = useState(true);
  const [gerentes, setGerentes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingLideres, setLoadingLideres] = useState(true);


  useEffect(() => {
    const fetchLideres = async () => {
      try {
        const { data } = await axios.get<Lider[]>(
          "https://desarrollotecnologicoar.com/api3/lideres_inmediatos/"
        );
        // Mapear los datos al formato que espera el Select
        const mapped = (data ?? []).map((lider) => ({
          value: lider.nombre,
          label: `${lider.nombre} - ${lider.correo}`
        }));
        setJefesInmediatos(mapped);
      } catch (e) {
        setError("Error al cargar líderes inmediatos.");
      } finally {
        setLoadingLideres(false);
      }
    };

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

    fetchLideres();
    fetchGerentes();
  }, []);

  const navigate = useNavigate();

  const convertirTexto = (texto: string): string =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .toLowerCase()
      .replace(/\s+/g, "_"); // Espacios por guiones bajos

  useEffect(() => {
    if (loadingLideres) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const correo = user.email;
          const q = query(collection(db, "usuarios"), where("correo", "==", correo));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0].data();
            setUserData(userDoc);
            const nombreCompleto = `${userDoc.nombre} ${userDoc.apellido_paterno} ${userDoc.apellido_materno}`;
            const area = userDoc.area;
            if (usuariosPermitidos.includes(user.email || "")) {
              fetchUsers();
            } else {
              fetchUsersByArea(area);
            }

            // Establecer valores iniciales en el formulario
            form.setFieldsValue({
              persona_emisor: nombreCompleto,
              area: area,
            });
          } else {
            message.error("No se encontró información del usuario.");
          }
        } catch (error) {
          console.error("Error al obtener los datos del usuario:", error);
          message.error("Hubo un error al cargar los datos del usuario.");
        } finally {
          setLoading(false); // Finalizar carga
        }
      }
    });

    return () => unsubscribe();
  }, [form, loadingLideres, usuariosPermitidos]); // Agrega usuariosPermitidos como dependencia

  const fetchUsersByArea = async (area: string) => {
    try {
      const q = query(collection(db, "usuarios"), where("area", "==", area));
      const querySnapshot = await getDocs(q);

      const users = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUsuarios(users); // Actualiza el estado con los usuarios obtenidos
    } catch (error) {
      console.error("Error al obtener usuarios por área:", error);
      message.error("Error al cargar los usuarios del área.");
    }
  };

  const fetchUsers = async () => {
    try {
      const q = collection(db, "usuarios");
      const querySnapshot = await getDocs(q);

      const users = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUsuarios(users); // Actualiza el estado con los usuarios obtenidos
    } catch (error) {
      console.error("Error al obtener usuarios", error);
      message.error("Error al cargar los usuarios.");
    }
  };


  const handleFinish = async (values: FormValues) => {
    values.area = convertirTexto(values.area);

    if (values.fecha_permiso && dayjs.isDayjs(values.fecha_permiso)) {
      values.fecha_permiso = dayjs(values.fecha_permiso).format("YYYY-MM-DD");
    }

    // Normalizar nombre_emisor
    let nombreEmisorTexto: string;
    let nombreEmisorId: string | undefined;

    if (typeof values.nombre_emisor === "object" && values.nombre_emisor !== null) {
      nombreEmisorTexto = values.nombre_emisor.label;
      nombreEmisorId = values.nombre_emisor.value;
    } else {
      nombreEmisorTexto = values.nombre_emisor as string;
    }

    // Si tu backend quiere ambos:
    (values as any).nombre_emisor_id = nombreEmisorId;
    values.nombre_emisor = nombreEmisorTexto;

    // Subida de archivo usa el texto legible
    if (fileToUpload) {
      try {
        const downloadURL = await handleUpload(fileToUpload, values.area, nombreEmisorTexto);
        values.downloadURL = downloadURL;
      } catch (error) {
        console.error("Error al subir el archivo:", error);
        message.error("Hubo un error al subir el archivo.");
        return;
      }
    }

    console.log("Datos enviados a la API:", values);

    if (formProps.onFinish) {
      formProps.onFinish(values);
    }
  };

  const handleGenerarActa = () => {
    setShowUploadSection(true); // Mostrar la sección de subida de archivos
  };

  const adjustedSaveButtonProps = {
    ...saveButtonProps,
    disabled: (() => {

      if (tipoRegistro === "Mala actitud" || tipoRegistro === "Falta injustificada.") {
        return (
          !fileToUpload || // Si no hay archivo, deshabilitar
          !fileToUpload.name.endsWith(".pdf") || // Si no es PDF, deshabilitar
          form
            .getFieldsError()
            .some(({ errors }) => errors.length > 0) // Si hay errores en los campos, deshabilitar
        );
      }

    })(),
  };
  const handleUpload = (file: File, area: string, nombre_emisor: string): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      try {
        setUploading(true);

        const areaNormalized = convertirTexto(area);
        const nombreEmisorNormalized = convertirTexto(nombre_emisor);

        const storagePath = `${areaNormalized}/${nombreEmisorNormalized}/${file.name}`;

        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Subiendo: ${progress}%`);
          },
          (error) => {
            console.error("Error al subir archivo:", error);
            message.error("Hubo un error al subir el archivo.");
            setUploading(false);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("Archivo disponible en:", downloadURL);
            message.success("Archivo subido correctamente.");
            setUploading(false);
            resolve(downloadURL);
          }
        );
      } catch (error) {
        console.error("Error al subir archivo:", error);
        message.error("Hubo un error al subir el archivo.");
        setUploading(false);
        reject(error);
      }
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "20%" }}>
        Cargando datos del usuario...
      </div>
    );
  }

  return (
    <Create saveButtonProps={adjustedSaveButtonProps}>
      <Form.Item>
        <span style={{ marginLeft: "10px" }}>
          <a
            onClick={() => navigate("/impresion_acta")}
            style={{ color: "#1890ff", cursor: "pointer" }}
          >
            ¿No cuentas con acta? Llénala aquí!
          </a>
        </span>
      </Form.Item>
      <Form<FormValues>
        {...formProps}
        form={form as unknown as FormInstance<FormValues>}
        layout="vertical"
        onFinish={handleFinish}
      >
        {/* Campo `persona_emisor` prellenado y deshabilitado */}
        <Form.Item
          label="Persona que emite este reporte"
          name="persona_emisor"
          rules={[{ required: true, message: "El campo Persona Emisor es obligatorio" }]}
        >
          <Input disabled /> {/* Campo deshabilitado */}
        </Form.Item>

        <Form.Item
          label="Nombre del empleado al que se le registrará la incidencia"
          name="nombre_emisor"
          rules={[{ required: true, message: "El campo Nombre Emisor es obligatorio" }]}
        >
          <Select
            showSearch
            labelInValue
            placeholder="Selecciona un usuario"
            options={usuarios.map((user) => ({
              value: String(user.id),
              label: `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno}`.trim(),
            }))}
            optionFilterProp="label"
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        {/* Campo `area` prellenado y deshabilitado */}
        <Form.Item
          label="Área"
          name="area"
          rules={[{ required: true, message: "El campo Área es obligatorio" }]}
        >
          <Input disabled /> {/* Campo deshabilitado */}
        </Form.Item>

        <Form.Item
          label="Jefe inmediato del empleado"
          name="jefe_inmediato"
          rules={[{ required: true, message: "El campo Jefe Inmediato es obligatorio" }]}

        >
          <Select
            placeholder="Selecciona un jefe inmediato"
            showSearch
            options={jefesInmediatos}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            } />
        </Form.Item>

        <Form.Item
          label="Tipo de registro"
          name="tipo_registro"
          rules={[{ required: true, message: "El campo Tipo de Registro es obligatorio" }]}
        >
          <Select
            onChange={(value) => {
              setTipoRegistro(value);
              form.setFieldsValue({ tipo_registro: value });
            }}
            options={[
              {
                value: "Mala actitud",
                label: "Reporte de actitud (irresponsabilidad, acciones negativas, daños, etc).",
              },
              {
                value: "Permiso de llegada tarde",
                label: "Permiso de llegada tarde por asuntos personales.",
              },
              {
                value: "Permiso de home office",
                label: "Permiso de home office",
              },
              {
                value: "Permiso de inasistencia a cuenta de vacaciones.",
                label: "Permiso de inasistencia a cuenta de vacaciones.",
              },
              { value: "Permiso de salida temprano.", label: "Permiso de salida temprano." },
              { value: "Retardo", label: "Retardo" },
              {
                value: "Permiso de llegada tarde por cita médica (IMSS).",
                label: "Permiso de llegada tarde por cita médica (IMSS).",
              },
              {
                value: "Falta justificada de acuerdo al Reglamento Interior de Trabajo.",
                label: "Falta justificada de acuerdo al Reglamento Interior de Trabajo.",
              },
              {
                value: "Falta injustificada.",
                label: "Falta injustificada."
              },
              {
                value: "Permiso tiempo x tiempo controlado",
                label: "Permiso tiempo x tiempo controlado",
              },
              {
                value: "Falta por incapacidad del IMSS.",
                label: "Falta por incapacidad del IMSS.",
              },
              {
                value: "Permiso de inasistencia sin goce de sueldo.",
                label: "Permiso de inasistencia sin goce de sueldo.",
              },
              { value: "Reconocimiento al desempeño", label: "Reconocimiento al desempeño" },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Ingrese la información del registro (causas de la falta, motivos del permiso, etc)."
          name="info_registro"
          rules={[{ required: true, message: "El campo Información del Registro es obligatorio" }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>

        {/* Condicionalmente renderizar `status_acta` */}
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

        {/* Mostrar botón "Generar Acta" condicionalmente */}
        {[
          "Reporte de actitud (irresponsabilidad, acciones negativas, daños, etc).",
          "Falta injustificada.",
          "Mala actitud",
        ].includes(tipoRegistro || "") && (
            <Form.Item>
              <Button type="primary" onClick={handleGenerarActa}>
                Adjuntar Acta
              </Button>
              <span style={{ marginLeft: "10px" }}>
                <a
                  onClick={() => navigate("/impresion_acta")}
                  style={{ color: "#1890ff", cursor: "pointer" }}
                >
                  ¿No cuentas con acta? Llénala aquí!
                </a>
              </span>
            </Form.Item>
          )}

        {showUploadSection && (
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
        )}
      </Form>
    </Create>
  );
};
