import { Edit, useForm } from "@refinedev/antd";
import { useParams, useNavigate, } from "react-router-dom";
import { useState, useEffect } from "react";
import { message, Form, Input, DatePicker, Select, Upload, Button } from "antd";
import axios from "axios";
import { values } from "pdf-lib";
import { identityMatrix } from "pdf-lib/cjs/types/matrix";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db, storage } from "../../firebaseConfig";
import { UploadOutlined } from "@ant-design/icons";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
// import { jefesInmediatos } from "./create";

export const BlogPostEdit = () => {
  const { formProps, saveButtonProps, queryResult, formLoading } = useForm({});
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [jefesInmediatos, setJefesInmediatos] = useState<any[]>([]);
  const [usuariosPermitidos, setUsuariosPermitidos] = useState<string[]>([]);
  const [loadingGerentes, setLoadingGerentes] = useState(true);
  const [gerentes, setGerentes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingLideres, setLoadingLideres] = useState(true);

  const convertirTexto = (texto: string): string =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .toLowerCase()
      .replace(/\s+/g, "_"); // Espacios por guiones bajos

  const blogPostsData = queryResult?.data?.data;
  type Lider = { id: number | string; nombre: string; correo: string };
  type Gerentes = string[];

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



  const handleFormSubmit = async (values: any) => {
    console.log("Formulario enviado con los valores:", values);
    try {
      await axios.patch(
        `https://desarrollotecnologicoar.com/api3/incidencias/${id}`,
        { ...values }
      );
      message.success(`La incidencia ha sido actualizada correctamente.`);

    } catch (error) {
      console.error("Error al actualizar la incidencia", error);
      message.error("Hubo un error al actualizar la incidencia.");
    }

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

    if (fileToUpload) {
      try {
        const downloadURL = await handleUpload(fileToUpload, values.area, values.nombre_emisor);
        values.downloadURL = downloadURL;
      } catch (error) {
        console.error("Error al subir el archivo:", error);
        message.error("Hubo un error al subir el archivo.");
      }

    }
  };

  const handleGenerarActa = () => {
    setShowUploadSection(true); // Mostrar la sección de subida de archivos
  };

  return (
    <Edit saveButtonProps={saveButtonProps} isLoading={formLoading}>
      <Form {...formProps} layout="vertical" onFinish={(values) => handleFormSubmit(values)}>

        <Form.Item
          label={'Marca temporal'}
          name={['marca_temporal']}
          rules={[{ required: true, message: 'El campo Marca temporal es obligatorio' }]}
        >
          <Input disabled={true} placeholder="YYYY-MM-DD HH:mm:ss" />


        </Form.Item>
        <Form.Item
          label={"Persona Emisor"}
          name={["persona_emisor"]}


          rules={[
            {
              required: true,
              message: "El campo Persona Emisor es obligatorio",

            },
          ]}
        >
          <Input disabled={true} />
        </Form.Item>

        <Form.Item
          label={"Nombre Emisor"}
          name={["nombre_emisor"]}
          rules={[
            {
              required: true,
              message: "El campo Nombre Emisor es obligatorio",
            },
          ]}
        >
          <Input disabled={true} />
        </Form.Item>

        {/* <Form.Item
          label={"Jefe Inmediato"}
          name={["jefe_inmediato"]}
          rules={[
            {
              required: true,
              message: "El campo Jefe Inmediato es obligatorio",
            },
          ]}
        >
          <Input />
        </Form.Item> */}

        <Form.Item
          label={"Jefe Inmediato"}
          name={["jefe_inmediato"]}
          rules={[
            {
              required: false,
              message: "El campo Status del Acta es obligatorio",
            },
          ]}
        >
          <Select
            options={jefesInmediatos}

          />
        </Form.Item>

        {/* <Form.Item
          label={"Tipo de Registro"}
          name={["tipo_registro"]}
          rules={[
            {
              required: true,
              message: "El campo Tipo de Registro es obligatorio",
            },
          ]}
        >
          <Input />
        </Form.Item> */}

        <Form.Item
          label={"Tipo de Registro"}
          name={["tipo_registro"]}
          rules={[
            {
              required: false,
              message: "El campo Status del Acta es obligatorio",
            },
          ]}
        >
          <Select
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
          label={"Información del Registro"}
          name="info_registro"
          rules={[
            {
              required: true,
              message: "El campo Información del Registro es obligatorio",
            },
          ]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>

        <Form.Item
          label={"Status del Acta"}
          name={["status_acta"]}
          initialValue={"Favor de emitir"}
          rules={[
            {
              required: false,
              message: "El campo Status del Acta es obligatorio",
            },
          ]}
        >
          <Select
            defaultValue={"Favor de emitir"}
            options={[
              { value: "Emitida y pendiente de firmar", label: "Emitida y pendiente de firmar" },
              { value: "Emitida y pendiente de envío", label: "Emitida y pendiente de envío físico" },
              { value: "Emitida y firmada", label: "Emitida y firmada" },
            ]}

          />
        </Form.Item>

        <Form.Item
          label={'Fecha en la que se concedió el permiso'}
          name={['fecha_permiso']}
          rules={[{ required: false, message: 'El campo Marca temporal es obligatorio' }]}>
          <Input disabled={true} placeholder="YYYY-MM-DD" />


        </Form.Item>
        <Form.Item
          label={"Área"}
          name={["area"]}
          rules={[
            {
              required: true,
              message: "El campo Área es obligatorio",
            },
          ]}
        >
          <Select
            options={[
              { value: "RRHH", label: "Recursos Humanos" },
              { value: "IT", label: "Tecnología de la Información" },
              { value: "Finanzas", label: "Finanzas" },
            ]}
            disabled={true}
            style={{ width: 200 }}
          />
        </Form.Item>

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
    </Edit>
  );
};
