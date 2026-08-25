import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select, DatePicker, Button, message } from "antd";
import dayjs from "dayjs";
import { FormInstance } from "antd";
import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
// import { jefesInmediatos } from "../incidencias";
import axios from "axios";


type FormValues = {
  nombre_completo: string;
  correo: string;
  jefe_inmediato: string;
  area: string;
  tipo_permiso: string;
  urgencia: boolean;
  comentarios: string;
  status: string;
  correo_lider: string;
  fecha_permiso?: any;
};


// const CorreosLideres = [
//   { value: 'luis.martinez@asiarobotica.com', label: "Luis Jaime Martínez Arredondo"},
//   { value: "carlos.rivas@asiarobotica.com", label: "Carlos Antonio Rivas Martínez"},
//   { value: "ana.lira@asiarobotica.com", label: "Ana Rosa Lira Ortíz"},
//   { value: 'armando.delarosa@asiarobotica.com', label: "Armando de la Rosa García"},
//   { value: 'citlali.coseth@asiarobotica.com', label: "Citlali Coseth De León"},
//   { value: 'marada@asiarobotica.com', label: "Ma. del Refugio Arroyo"},       
//   { value: "laura.arroyo@asiarobotica.com", label: "Laura Beatriz Arroyo Salcedo"},
//   { value: 'esteban@asiarobotica.com', label: "Esteban Ramírez"},
//   { value: "karen@asiarobotica.com", label: "Karen Ibarra Ramírez"},
//   { value: "lucero.avila@asiarobotica.com", label: "Lucero Ávila Cortes"},
//   { value: 'ana.sanchez@asiarobotica.com', label: "Ana Sánchez Murúa"},
//   { value: "esmeralda.ramirez@asiarobotica.com", label: "Esmeralda Ramírez Díaz"},
//   { value: "saul.sandoval@asiarobotica.com", label: "Alonso Saúl Sandoval López"},
//   { value: "sergio.garcia@asiarobotica.com", label: "Sergio Alejandro García Trejo"},
//   { value: "jaime.flores@asiarobotica.com", label: "Jaime Daniel Flores Hernández"},
//   { value: "Jorge Antonio Lías Lopez", label: "Jorge Antonio Lías Lopez"},
//   { value: "pablo@asiarobotica.com", label: "Pablo Ramírez Diaque"},
//   // { value: "christian.mendoza@asiarobotica.com", label: "Christian Mendoza Nepomuceno"},
//   { value: "gustavo.gallegos@asiarobotica.com", label: "Gustavo Gallegos Cortés"},
//   { value: "saul.espinoza@asiarobotica.com", label: "Saúl Espinoza Silva"},
//   {value: 'jared.guerra@asiarobotica.com', label: "Jared Guerra García"},
//   {value: 'francisco.hernandez@asiarobotica.com', label: "Francisco Javier Hernandez Castro"},
//   {value: 'omar.diaz@asiarobotica.com', label: "Omar Díaz"}
// ];
type Lider = { id: number | string; nombre: string; correo: string; area: string; telefono: string };
type Gerentes = string[];



export const CreatePermit = () => {
  const { formProps, saveButtonProps, form } = useForm<FormValues>();
  const [userData, setUserData] = useState<Partial<FormValues>>({});

  const [loading, setLoading] = useState(false); // Estado para deshabilitar el botón de envío
  const isSubmitting = useRef(false); // Flag para evitar múltiples envíos
  const [user, setUser] = useState('')
  const [jefesInmediatos, setJefesInmediatos] = useState<{ value: string; label: string }[]>([]);
  const [loadingLideres, setLoadingLideres] = useState(true);
  const [loadingGerentes, setLoadingGerentes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usuariosSidebar, setUsuariosSidebar] = useState<Lider[]>([]);
  const [usuariosPermitidos, setUsuariosPermitidos] = useState<Gerentes>([]);
  const [data, setData] = useState<Lider[]>([]);  

  const convertirTexto = (texto: string): string => {
    return texto
      .normalize("NFD")                    // Descompone caracteres Unicode (Ej: á -> a + ́)
      .replace(/[\u0300-\u036f]/g, "")     // Elimina los diacríticos (acentos)
      .toLowerCase()                       // Convierte a minúsculas
      .replace(/\s+/g, '_');               // Reemplaza espacios por guiones bajos
  };

  useEffect(() => {
    const fetchLideres = async () => {
      try {
        const { data } = await axios.get<Lider[]>(
          "https://desarrollotecnologicoar.com/api3/lideres_inmediatos/"
        );
        setUsuariosSidebar(data ?? []);
        setJefesInmediatos(
          (data ?? []).map((lider) => ({
            value: lider.nombre,
            label: `${lider.nombre} -- ${lider.area}`,
          }))
        );
        setData(data ?? []);
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


const enviarTemplate = async (variables: Record<string, string>, telefono: string): Promise<boolean> => {
    try {
        const response = await fetch(
            "https://desarrollotecnologicoar.com/api12/almacen/send-whatsapp-template",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    telefono: '+52' + telefono,
                    contentSid: "HX32587ae923cf6e80aca016b0a2ea749e",
                    variables,
                }),
            }
        );
        if (!response.ok) {
            // Se registra el cuerpo de la respuesta para poder diagnosticar el motivo real del rechazo (Twilio/API)
            const errorBody = await response.text().catch(() => "");
            console.error("Fallo al enviar WhatsApp:", response.status, errorBody, { telefono, variables });
        }
        return response.ok;
    } catch (error) {
        console.error("Error al enviar WhatsApp:", error);
        return false;
    }
};



  // Escucha los cambios de autenticación y busca los datos del usuario en Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const correo = user.email;
          const q = query(
            collection(db, "usuarios"),
            where("correo", "==", correo)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0].data();
            setUserData(userDoc);
            const nombreCompleto = `${userDoc.nombre} ${userDoc.apellido_paterno} ${userDoc.apellido_materno}`;

            form.setFieldsValue({
              nombre_completo: nombreCompleto,
              correo: userDoc.correo,
              jefe_inmediato: userDoc.jefe_inmediato,
              area: convertirTexto(userDoc.area),
            });
          } else {
            message.error("No se encontró información del usuario.");
          }
        } catch (error) {
          console.error("Error al obtener los datos del usuario:", error);
          message.error("Hubo un error al cargar los datos del usuario.");
        }
      }
    });

    return () => unsubscribe();
  }, [form]);


  const handleFinish = async (values: FormValues) => {
    if (isSubmitting.current) return; // Evitar múltiples envíos
    isSubmitting.current = true; // Establecer flag de envío

    try {
      setLoading(true); // Mostrar estado de carga en el botón

      // Buscar los datos del líder inmediato (correo y teléfono)
      const lider = usuariosSidebar.find((lider) => lider.nombre === values.jefe_inmediato);
      const correo_lider = lider?.correo;
      const telefono_lider = lider?.telefono;

      // Establecer el status como "Pendiente"
      const dataToSend = {
        ...values,
        status: "Pendiente",
        correo_lider: correo_lider,
        fecha_permiso: values.fecha_permiso
          ? dayjs(values.fecha_permiso).format("YYYY-MM-DD")
          : undefined,
      };

      // console.log("Datos enviados al servidor:", dataToSend);

      const response = await fetch(
        "https://www.desarrollotecnologicoar.com/api3/crear_permiso",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        }
      );
      if (response.ok) {
        const responseData = await response.json();
        const permisoId = String(responseData.id ?? responseData.permiso_id ?? '');

        message.success("Permiso registrado con éxito");

        if (!telefono_lider) {
          message.warning("El líder seleccionado no tiene teléfono registrado; no se envió notificación WhatsApp.");
        } else {
          const variables: Record<string, string> = {
            '1': values.jefe_inmediato,
            '2': values.nombre_completo,
            '3': values.tipo_permiso,
            '4': permisoId,
          };
          const enviado = await enviarTemplate(variables, telefono_lider);
          if (!enviado) {
            message.warning("Permiso guardado, pero no se pudo enviar la notificación de WhatsApp.");
          }
        }

        form.resetFields();

      } else {
        const errorData = await response.json();
        message.error(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Error al enviar los datos:", error);
      message.error("Hubo un error al registrar el permiso.");
    } finally {
      setLoading(false); // Restaurar el estado de carga
      isSubmitting.current = false; // Reiniciar el flag de envío
    }
  };

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form<FormValues>
        {...formProps}
        form={form as unknown as FormInstance<FormValues>}
        layout="vertical"
        onFinish={handleFinish}
      >
        <Form.Item
          label="Nombre Completo"
          name="nombre_completo"
          rules={[{ required: true, message: "El campo Nombre Completo es obligatorio" }]}
        >
          <Input disabled />
        </Form.Item>

        <Form.Item
          label="Correo"
          name="correo"
          rules={[{ required: true, message: "El campo Correo es obligatorio" }]}
        >
          <Input disabled />
        </Form.Item>
        <Form.Item
          label="Jefe Inmediato del empleado"
          name="jefe_inmediato"
          rules={[{ required: true, message: "El campo Jefe Inmediato es obligatorio" }]}
        >
          <Select
            placeholder="Selecciona un jefe inmediato"
            options={jefesInmediatos}
          />
        </Form.Item>

        <Form.Item
          label="Área"
          name="area"
          rules={[{ required: true, message: "El campo Área es obligatorio" }]}
        >
          <Select disabled options={[
            { value: "RRHH", label: "Recursos Humanos" },
            { value: "IT", label: "Tecnología de la Información" },
            { value: "Finanzas", label: "Finanzas" },
          ]} />
        </Form.Item>

        <Form.Item
          label="Tipo de Permiso"
          name="tipo_permiso"
          rules={[{ required: true, message: "El campo Tipo de Permiso es obligatorio" }]}
        >
          <Select options={[
            { value: "Permiso de llegada tarde", label: "Permiso de llegada tarde" },
            { value: "Permiso de salida temprano", label: "Permiso de salida temprano" },
            { value: "Permiso de inasistencia ", label: "Día Personal / Inasistencia a toma de vacaciones" },
            { value: "Trabajo Remoto", label: "Trabajo Remoto" },
            { value: "Permiso de inasistencia por salud", label: "Permiso de inasistencia por cuestiones de salud" },
            { value: "Permiso para cambio de horario temporal", label: "Permiso para cambio de horario temporal" }
          ]} />
        </Form.Item>

        <Form.Item
          label="Urgencia"
          name="urgencia"
          rules={[{ required: true, message: "Selecciona si es urgente o no" }]}
        >
          <Select options={[
            { value: true, label: "Urgente" },
            { value: false, label: "No Urgente" },
          ]} />
        </Form.Item>

        <Form.Item
          label="Comentarios"
          name="comentarios"
          rules={[{ required: true, message: "El campo Comentarios es obligatorio" }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>

        <Form.Item
          label="Fecha de Permiso"
          name="fecha_permiso"
          rules={[{ required: true, message: "El campo Fecha de Permiso es obligatorio" }]}
        >
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} {...saveButtonProps}>
            Enviar
          </Button>
        </Form.Item>
      </Form>
    </Create>
  );
};
