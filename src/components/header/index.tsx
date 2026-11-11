import type { RefineThemedLayoutV2HeaderProps } from "@refinedev/antd";
import {
  Layout as AntdLayout,
  Avatar,
  Space,
  Switch,
  theme,
  Typography,
  Button,
  Grid,
} from "antd";
import React, { useContext, useEffect, useState } from "react";
import { ColorModeContext } from "../../contexts/color-mode";
import { signOut, onAuthStateChanged } from "firebase/auth"; // Importamos signOut y onAuthStateChanged
import { auth } from "../../firebaseConfig"; // Asegúrate de que este path es correcto

const { Text } = Typography;
const { useToken } = theme;

type IUser = {
  name: string | null;
  email: string | null;
};

export const Header: React.FC<RefineThemedLayoutV2HeaderProps> = ({
  sticky = true,
}) => {
  const { token } = useToken();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { mode, setMode } = useContext(ColorModeContext);
  const [user, setUser] = useState<IUser | null>(null); // Estado para almacenar los datos del usuario

  useEffect(() => {
    // Utilizamos Firebase para verificar si el usuario está autenticado
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Si el usuario está autenticado, almacenamos sus datos
        setUser({
          name: currentUser.displayName,
          email: currentUser.email,
        });
      } else {
        // Si no hay usuario autenticado, establecemos el estado como null
        setUser(null);
      }
    });

    // Cleanup del listener
    return () => unsubscribe();
  }, []);

  const headerStyles: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: isMobile ? "0px 12px" : "0px 24px",
    height: "64px",
    whiteSpace: "nowrap",
  };

  if (sticky) {
    headerStyles.position = "sticky";
    headerStyles.top = 0;
    headerStyles.zIndex = 1;
  }

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await signOut(auth); // Cierra sesión en Firebase
      // window.location.reload(); // Opcional: Recargar la página para redirigir a la pantalla de login
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Generar un color aleatorio para el avatar
  const generateRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  // Obtener la primera letra del nombre del usuario
  const getUserInitial = (name: string | null) => {
    return name ? name.charAt(0).toUpperCase() : "";
  };

  const displayName = (
    <>
        {user?.name ? (
            <>
                Hola,<Text strong>{user.name}</Text>
            </>
        ) : (
            'Hola, invitado'
        )}
    </>
);

  return (
    <AntdLayout.Header style={headerStyles}>
      <Space>
        <Switch
          checkedChildren="🌛"
          unCheckedChildren="🔆"
          onChange={() => setMode(mode === "light" ? "dark" : "light")}
          defaultChecked={mode === "dark"}
        />
        <Space style={{ marginLeft: isMobile ? 0 : "8px" }} size={isMobile ? "small" : "middle"}>
          {/* Mostrar el nombre del usuario */}
          {!isMobile && displayName}

          {/* Mostrar el correo del usuario
          {user?.email && <Text>{user.email}</Text>} */}

          {/* Mostrar avatar con la primera letra del nombre y fondo aleatorio */}
          <Avatar
            style={{
              backgroundColor: generateRandomColor(),
              color: "white",
            }}
          >
            {getUserInitial(user?.name || null)}
          </Avatar>

          {/* Botón para cerrar sesión */}
          <Button type="primary" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </Space>
      </Space>
    </AntdLayout.Header>
  );
};
