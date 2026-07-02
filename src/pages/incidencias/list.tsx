import React, { useState, useEffect, useCallback } from "react";
import {
  DateField,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { Space, Table, Input, Row, Col, Spin, message, Pagination } from "antd";
import { auth, db } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
// import { usuariosPermitidos } from "../../user_config";
import { BaseRecord } from "@refinedev/core";
import { Button } from "antd";
import { FilePdfOutlined } from "@ant-design/icons";
import axios from "axios";

export const BlogPostList = () => {
  type Gerentes= string[] 
  const { tableProps } = useTable({ syncWithLocation: true });

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userArea, setUserArea] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<BaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Tamaño de la página
  const [usuariosPermitidos, setUsuariosPermitidos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingGerentes, setLoadingGerentes] = useState(true);

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

  const convertirTexto = (texto: string): string =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, "_");

  const sortByRecent = (data: BaseRecord[]) =>
    [...data].sort((a: any, b: any) => {
      const dateA = new Date(a.marca_temporal).getTime();
      const dateB = new Date(b.marca_temporal).getTime();
      return dateB - dateA;
    });

  const filtrarDatos = useCallback(
    (area: string | null, data: BaseRecord[]) => {
      const dataMutable = [...data];

      if (usuariosPermitidos.includes(userEmail || "")) {
        setFilteredData(sortByRecent(dataMutable));
      } else {
        const areaFiltrada = convertirTexto(area || "");
        const datosFiltrados = dataMutable.filter(
          (incidencia: any) => convertirTexto(incidencia.area) === areaFiltrada
        );
        setFilteredData(sortByRecent(datosFiltrados));
      }
    },
    [userEmail]
  );

  useEffect(() => {
    if (loadingGerentes) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email);

        try {
          const q = query(collection(db, "usuarios"), where("correo", "==", user.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0].data();
            const area = convertirTexto(userDoc.area);
            setUserArea(area);

            filtrarDatos(area, tableProps.dataSource ? [...tableProps.dataSource] : []);
          } else {
            message.error("No se encontró información del usuario.");
          }
        } catch (error) {
          console.error("Error al obtener datos del usuario:", error);
          message.error("Error al cargar los datos del usuario.");
        }
      } else {
        message.error("Usuario no autenticado.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filtrarDatos, tableProps.dataSource, loadingGerentes]);




  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value.toLowerCase());
  };

  const searchedData = filteredData.filter((item: any) =>
    item.persona_emisor.toLowerCase().includes(searchText) ||
    item.nombre_emisor.toLowerCase().includes(searchText) ||
    item.tipo_registro.toLowerCase().includes(searchText)
  );

  // Datos paginados según el estado `currentPage`
  const paginatedData = searchedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page); // Actualizar la página actual
  };

  if (loading) {
    return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  }

  if (paginatedData.length === 0) {
    return (
      <>
        <div>Aún no hay registro de incidencias.</div>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Input
              placeholder="Buscar por Persona Emisor, Nombre o Tipo de Registro"
              value={searchText}
              onChange={handleSearch}
            />
          </Col>
        </Row>

        <Button
          type="primary"
          size="large"
          onClick={() => {
            window.location.href = "/incidencias/create";
          }}
          style={{
            padding: "10px 40px",
            fontSize: "18px",
            backgroundColor: "#ff4d4f", // Color de fondo personalizado
            borderColor: "#ff4d4f", // Borde del mismo color
          }}
        >
          Crear incidencia
        </Button>
      </>
    );
  }

  return (
    <List>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input
            placeholder="Buscar por Persona Emisor, Nombre o Tipo de Registro"
            value={searchText}
            onChange={handleSearch}
          />
        </Col>
        <Col span={8} offset={8} style={{ textAlign: "right" }}>
          <Button
            type="primary"
            size="middle"
            onClick={() => {
              window.location.href = "/actas";
            }}
            style={{
              padding: "10px 40px",
              fontSize: "16px",
              backgroundColor: "#ff4d4f", // Color de fondo personalizado
              borderColor: "#ff4d4f", // Borde del mismo color
              width: "25%",

            }}
          >
            <FilePdfOutlined />
            Ver actas
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={paginatedData}
        rowKey="id"
        pagination={false}
        scroll={{ y: 'calc(100vh - 300px)' }}
        style={{ width: '100%' }}
      >
        <Table.Column dataIndex="id" title="ID" />
        <Table.Column dataIndex="persona_emisor" title="Persona Emisor" />
        <Table.Column dataIndex="nombre_emisor" title="Nombre Emisor" />
        <Table.Column dataIndex="tipo_registro" title="Tipo de Registro" />
        <Table.Column
          dataIndex="info_registro"
          title="Información de Registro"
          render={(value: any) => (value ? `${value.slice(0, 80)}...` : "-")}
        />
        <Table.Column dataIndex="status_acta" title="Status del Acta" />
        <Table.Column
          dataIndex="marca_temporal"
          title="Fecha de Creación"
          render={(value: any) => <DateField value={value} format="DD/MM/YYYY" />}
        />
        <Table.Column
          title="Acciones"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <ShowButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>

      {/* Paginación controlada manualmente */}
      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={searchedData.length}
        onChange={handlePageChange}        onShowSizeChange={(_, size) => { setPageSize(size); setCurrentPage(1); }}
        showSizeChanger
        pageSizeOptions={['10', '20', '30', '50']}        style={{ marginTop: 16, textAlign: "right" }}
      />
    </List>
  );
};
