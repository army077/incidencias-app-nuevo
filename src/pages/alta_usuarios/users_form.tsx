import React, { useEffect, useState } from 'react';
import { Form, Input, Button, message, Table, Popconfirm, Select, Modal, Tag } from "antd";
import { Create, useForm } from "@refinedev/antd";
import { auth, db, functions } from '../../firebaseConfig';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';
// import { usuariosPermitidos } from '../../user_config';
import axios from 'axios';
import moment from 'moment';

export const opciones = [
    { value: "Desarrollo Tecnológico", label: "Desarrollo Tecnológico" },
    { value: "Logística", label: "Logística" },
    { value: "Producción CNC", label: "Producción CNC" },
    { value: "Calidad y Procesos", label: "Calidad y Procesos" },
    { value: "Garantías y Satisfacción al cliente", label: "Garantías y Satisfacción al cliente" },
    { value: "Almacén", label: "Almacén" },
    { value: "Mercadotecnia", label: "Mercadotecnia" },
    { value: "Soporte Técnico Presencial", label: "Soporte Técnico Presencial" },
    { value: "Crédito y Cobranza", label: "Crédito y Cobranza" },
    { value: "Compras", label: "Compras" },
    { value: "Ventas de refacciones y servicios", label: "Ventas de refacciones y servicios" },
    { value: "Servicio Técnico Telefónico", label: "Servicio Técnico Telefónico" },
    { value: "Contabilidad y Finanzas", label: "Contabilidad y Finanzas" },
    { value: "Recursos Humanos", label: "Recursos Humanos" },
    { value: "Seguridad e Higiene", label: "Seguridad e Higiene" },
    { value: "Reparaciones", label: "Reparaciones" },
    { value: "Laser Express", label: "Laser Express" },
    { value: "Demostraciones", label: "Demostraciones" },
]


const jerarquias = [
    { value: "Empleado", label: "Empleado" },
    { value: "Lider", label: "Líder Inmediato" },
    { value: "Gerente", label: "Gerente" },
]

const UserCreate: React.FC = () => {
    const { formProps, saveButtonProps, form } = useForm();
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [selectedArea, setSelectedArea] = useState<string | null>(null);
    const [searchNombre, setSearchNombre] = useState('');
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [userArea, setUserArea] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [reactivando, setReactivando] = useState(false); // true cuando el modal se abre desde Reactivar
    const [editForm] = Form.useForm();

    const normArea = (a: string) =>
        a.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '_');

    const isAuthorized =
        currentUserEmail === 'developer@asiarobotica.com' || currentUserEmail === 'marada@asiarobotica.com' ||
        normArea(userArea ?? '') === 'recursos_humanos';

    const convertirTexto = (texto: string): string =>
        texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
            .toLowerCase()
            .replace(/\s+/g, "_"); // Espacios por guiones bajos

    const normalizarTextoBusqueda = (texto: string): string =>
        texto
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

    useEffect(() => {
        const unsuscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUserEmail(user.email || null);
                try {
                    const q = query(collection(db, 'usuarios'), where('correo', '==', user.email));
                    const snap = await getDocs(q);
                    if (!snap.empty) setUserArea(snap.docs[0].data().area ?? null);
                } catch { /* ignorar */ }
            } else {
                setCurrentUserEmail(null);
                setUserArea(null);
            }
        });
        return () => unsuscribe();
    }, []);

    const onFinish = async (values: any) => {
        try {
            console.log('Datos enviados:', values);

            const apiKey = 'AIzaSyDArlaidbMgHfMvy4U6HcaNS3B9j59pN60'; // Tu API Key de Firebase
            const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: values.correo,
                    password: values.contraseña,
                    returnSecureToken: false, // Evita que el usuario se autentique automáticamente
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || `Error al registrar el usuario`);
            }

            if (values.jerarquia != "Empleado") {
                try {
                    console.log('Registrando líder en la API externa:', {
                        nombre: values.nombreCompleto + " " + values.apellidoPaterno + " " + values.apellidoMaterno,
                        area: convertirTexto(values.areaTrabajo),
                        ativo: 'true',
                        correo: values.correo,
                        jerarquia: values.jerarquia
                    });
                    await axios.post('https://desarrollotecnologicoar.com/api3/lideres_incidencias/', {
                        nombre: values.nombreCompleto + " " + values.apellidoPaterno + " " + values.apellidoMaterno,
                        area: convertirTexto(values.areaTrabajo),
                        ativo: 'true',
                        correo: values.correo,
                        jerarquia: values.jerarquia
                    }
                    )
                } catch (error) {
                    console.error('Error al registrar líder en la API externa:', error);
                    message.error('Error al registrar líder en la API externa.');
                }
            }


            const { localId } = await response.json(); // Obtener el UID del usuario

            // Guardar en Firestore
            await setDoc(doc(db, 'usuarios', localId), {
                nombre: values.nombreCompleto,
                apellido_paterno: values.apellidoPaterno,
                apellido_materno: values.apellidoMaterno,
                area: values.areaTrabajo,
                correo: values.correo,
                fecha_creado: serverTimestamp(),
                numero_empleado: values.numeroEmpleado
            });

            message.success('Usuario registrado exitosamente.');
            form.resetFields();
            fetchUsuarios(); // Refrescar la lista de usuarios
        } catch (error) {
            console.error('Error al registrar usuario:', error);
            // Check if error is an instance of Error and handle accordingly
            if (error instanceof Error) {
                message.error(`Error al registrar el usuario: ${error.message}`);
            } else {
                message.error('Error desconocido al registrar el usuario');
            }
        }
    };

    // Obtener usuarios de Firestore
    const fetchUsuarios = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'usuarios'));
            const usuariosData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setUsuarios(usuariosData);
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            message.error('Error al cargar los usuarios.');
        }
    };

    // Editar usuario — abre el modal con datos prellenados
    const handleEdit = (record: any) => {
        setReactivando(false);
        setEditingUser(record);
        editForm.setFieldsValue({
            nombre: record.nombre,
            apellido_paterno: record.apellido_paterno,
            apellido_materno: record.apellido_materno,
            area: record.area,
            numero_empleado: record.numero_empleado,
        });
        setEditModalVisible(true);
    };

    // Reactivar con edición — abre el mismo modal marcado para reactivar
    const handleReactivar = (record: any) => {
        setReactivando(true);
        setEditingUser(record);
        editForm.setFieldsValue({
            nombre: record.nombre,
            apellido_paterno: record.apellido_paterno,
            apellido_materno: record.apellido_materno,
            area: record.area,
            numero_empleado: record.numero_empleado,
        });
        setEditModalVisible(true);
    };

    // Guardar cambios del usuario editado en Firestore
    const handleUpdate = async (values: any) => {
        if (!editingUser) return;
        try {
            await setDoc(
                doc(db, 'usuarios', editingUser.id),
                {
                    nombre: values.nombre,
                    apellido_paterno: values.apellido_paterno,
                    apellido_materno: values.apellido_materno,
                    area: values.area,
                    correo: editingUser.correo,
                    fecha_creado: editingUser.fecha_creado,
                    numero_empleado: values.numero_empleado,
                    activo: reactivando ? true : (editingUser.activo ?? true),
                }
            );
            message.success(reactivando ? 'Usuario reactivado con datos actualizados.' : 'Usuario actualizado correctamente.');
            setEditModalVisible(false);
            setEditingUser(null);
            setReactivando(false);
            fetchUsuarios();
        } catch (err) {
            console.error('Error al actualizar usuario:', err);
            message.error('Error al actualizar el usuario.');
        }
    };

    // Dar de baja — soft delete en Firestore + eliminar de Firebase Auth
    const handleDarDeBaja = async (userId: string) => {
        try {
            const deleteAuthUser = httpsCallable(functions, 'deleteAuthUser');
            await deleteAuthUser({ uid: userId });
            await setDoc(doc(db, 'usuarios', userId), { activo: false }, { merge: true });
            message.success('Usuario dado de baja y credenciales eliminadas.');
            fetchUsuarios();
        } catch (error) {
            console.error('Error al dar de baja:', error);
            message.error('Error al dar de baja al usuario.');
        }
    };

    // Reactivar usuario
    const handleActivar = async (userId: string) => {
        try {
            await setDoc(doc(db, 'usuarios', userId), { activo: true }, { merge: true });
            message.success('Usuario reactivado.');
            fetchUsuarios();
        } catch (error) {
            console.error('Error al reactivar:', error);
            message.error('Error al reactivar al usuario.');
        }
    };

    useEffect(() => {
        fetchUsuarios();
        form.resetFields();
    }, [form]);

    const textoBusqueda = normalizarTextoBusqueda(searchNombre);
    const filteredUsuarios = usuarios.filter((user) => {
        const coincideArea = selectedArea ? user.area === selectedArea : true;

        if (!textoBusqueda) {
            return coincideArea;
        }

        const nombre = normalizarTextoBusqueda(user.nombre || '');
        const apellidoPaterno = normalizarTextoBusqueda(user.apellido_paterno || '');
        const apellidoMaterno = normalizarTextoBusqueda(user.apellido_materno || '');
        const nombreCompleto = `${nombre} ${apellidoPaterno} ${apellidoMaterno}`.trim();

        const coincideNombre =
            nombre.includes(textoBusqueda) ||
            apellidoPaterno.includes(textoBusqueda) ||
            apellidoMaterno.includes(textoBusqueda) ||
            nombreCompleto.includes(textoBusqueda);

        return coincideArea && coincideNombre;
    });

    const columns = [
        { title: 'Correo', dataIndex: 'correo', key: 'correo', sorter: (a: any, b: any) => a.correo.localeCompare(b.correo) },
        { title: 'Nombre Completo', dataIndex: 'nombre', key: 'nombre', sorter: (a: any, b: any) => a.nombre.localeCompare(b.nombre), },
        { title: 'Apellido Paterno', dataIndex: 'apellido_paterno', key: 'apellido_paterno', sorter: (a: any, b: any) => a.apellido_paterno.localeCompare(b.apellido_paterno) },
        { title: 'Apellido Materno', dataIndex: 'apellido_materno', key: 'apellido_materno', sorter: (a: any, b: any) => a.apellido_materno.localeCompare(b.apellido_materno), },
        { title: 'Área de Trabajo', dataIndex: 'area', key: 'area', sorter: (a: any, b: any) => a.area.localeCompare(b.area), },
        {
            title: 'Fecha Creado',
            dataIndex: 'fecha_creado',
            key: 'fecha_creado',
            render: (text: any) => text?.toDate().toLocaleString(),
            sorter: (a: any, b: any) => a.fecha_creado?.toDate() - b.fecha_creado?.toDate(),
        },
        { title: 'Numero de empleado', dataIndex: 'numero_empleado', key: 'numero_empleado', sorter: (a: any, b: any) => a.numero_empleado - b.numero_empleado, },
        {
            title: 'Estado',
            key: 'activo',
            render: (_: any, record: any) => (
                record.activo === false
                    ? <Tag color="red">Inactivo</Tag>
                    : <Tag color="green">Activo</Tag>
            ),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            render: (_: any, record: any) => (
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                        type="primary"
                        disabled={!isAuthorized}
                        onClick={() => handleEdit(record)}
                    >
                        Editar
                    </Button>
                    {record.activo === false ? (
                        <Popconfirm
                            title="¿Reactivar este usuario? Podrás actualizar sus datos si la licencia fue heredada."
                            onConfirm={() => handleReactivar(record)}
                            okText="Sí, editar y reactivar"
                            cancelText="No"
                        >
                            <Button type="default" disabled={!isAuthorized}>Reactivar</Button>
                        </Popconfirm>
                    ) : (
                        <Popconfirm
                            title="¿Dar de baja este usuario?"
                            onConfirm={() => handleDarDeBaja(record.id)}
                            okText="Sí"
                            cancelText="No"
                        >
                            <Button danger disabled={!isAuthorized}>Dar de Baja</Button>
                        </Popconfirm>
                    )}
                </div>
            ),
        },
    ];

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical" onFinish={onFinish}>
                <Form.Item
                    label="Correo Electrónico"
                    name="correo"
                    rules={[
                        { required: true, message: 'Por favor, ingresa un correo electrónico' },
                        { type: 'email', message: 'Por favor, ingresa un correo válido' },
                    ]}
                >
                    <Input placeholder="Correo Electrónico" />
                </Form.Item>

                <Form.Item
                    label="Contraseña"
                    name="contraseña"
                    rules={[{ required: true, message: 'Por favor, ingresa una contraseña' }]}
                >
                    <Input.Password placeholder="Contraseña" />
                </Form.Item>

                <Form.Item
                    label="Nombre Completo"
                    name="nombreCompleto"
                    rules={[{ required: true, message: 'Por favor, ingresa el nombre completo' }]}
                >
                    <Input placeholder="Nombre Completo" />
                </Form.Item>

                <Form.Item
                    label="Apellido Paterno"
                    name="apellidoPaterno"
                    rules={[{ required: true, message: 'Por favor, ingresa el apellido paterno' }]}
                >
                    <Input placeholder="Apellido Paterno" />
                </Form.Item>

                <Form.Item
                    label="Apellido Materno"
                    name="apellidoMaterno"
                    rules={[{ required: true, message: 'Por favor, ingresa el apellido materno' }]}
                >
                    <Input placeholder="Apellido Materno" />
                </Form.Item>

                <Form.Item
                    label="Área de Trabajo"
                    name="areaTrabajo"
                    rules={[{ required: true, message: 'Por favor, ingresa el área de trabajo' }]}
                >
                    <Select options={opciones} />
                </Form.Item>

                <Form.Item
                    label="Numero de empleado"
                    name="numeroEmpleado"
                    rules={[{ required: true, message: 'Por favor, ingresa el número de empleado' }]}
                >
                    <Input placeholder="# de empleado" />
                </Form.Item>

                <Form.Item
                    label="Jerarquía"
                    name="jerarquia"
                    rules={[{ required: true, message: "Selecciona la jerarquía" }]}
                >
                    <Select
                        options={[
                            { value: "Empleado", label: "Empleado" },
                            { value: "Lider", label: "Líder Inmediato" },
                            { value: "Gerente", label: "Gerente" },
                        ]}
                    />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" disabled={!isAuthorized}>
                        Registrar Usuario
                    </Button>
                </Form.Item>


            </Form>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <Select
                    placeholder="Filtrar por área"
                    style={{ width: 240 }}
                    onChange={(value) => setSelectedArea(value ?? null)}
                    allowClear
                    options={opciones}
                />

                <Input
                    placeholder="Buscar por nombre o apellidos"
                    style={{ width: 320, maxWidth: '100%' }}
                    value={searchNombre}
                    onChange={(e) => setSearchNombre(e.target.value)}
                    allowClear
                />
            </div>

            <Table dataSource={filteredUsuarios} columns={columns} rowKey="id" pagination={{ pageSize: 5 }} scroll={{ x: 800, y: 300 }} />

            <Modal
                title={reactivando ? 'Reactivar Usuario (actualiza los datos si la licencia fue heredada)' : 'Editar Usuario'}
                open={editModalVisible}
                onCancel={() => { setEditModalVisible(false); setEditingUser(null); setReactivando(false); }}
                onOk={() => editForm.submit()}
                okText={reactivando ? 'Reactivar' : 'Guardar'}
                cancelText="Cancelar"
            >
                <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
                    <Form.Item label="Nombre" name="nombre" rules={[{ required: true, message: 'Campo requerido' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Apellido Paterno" name="apellido_paterno" rules={[{ required: true, message: 'Campo requerido' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Apellido Materno" name="apellido_materno">
                        <Input />
                    </Form.Item>
                    <Form.Item label="Área de Trabajo" name="area" rules={[{ required: true, message: 'Campo requerido' }]}>
                        <Select options={opciones} />
                    </Form.Item>
                    <Form.Item label="Número de Empleado" name="numero_empleado">
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </Create>
    );
};

export default UserCreate;
