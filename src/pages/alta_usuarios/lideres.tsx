import React, { useEffect, useMemo, useState, useContext } from "react";
import axios from "axios";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select as MuiSelect,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import GroupsIcon from "@mui/icons-material/Groups";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import SearchIcon from "@mui/icons-material/Search";
import { ColorModeContext } from "../../contexts/color-mode";
import { FaRegTrashCan } from 'react-icons/fa6';
import { auth, db } from "../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

const areasLideres = [
  { value: "almacen",                          label: "Almacén" },
  { value: "calidad_y_procesos",               label: "Calidad y Procesos" },
  { value: "compras",                          label: "Compras" },
  { value: "contabilidad_y_finanzas",          label: "Contabilidad y Finanzas" },
  { value: "credito_y_cobranza",               label: "Crédito y Cobranza" },
  { value: "demostraciones",                   label: "Demostraciones" },
  { value: "desarrollo_tecnologico",           label: "Desarrollo Tecnológico" },
  { value: "garantias_y_satisfaccion",         label: "Garantías y Satisfacción al cliente" },
  { value: "gerente_general",                  label: "Gerente General" },
  { value: "gerente_ingenieria",               label: "Gerente de Ingeniería" },
  { value: "laser_express",                    label: "Laser Express" },
  { value: "lider_operacional",                label: "Líder Operacional" },
  { value: "logistica",                        label: "Logística" },
  { value: "mercadotecnia",                    label: "Mercadotecnia" },
  { value: "produccion_cnc",                   label: "Producción CNC" },
  { value: "reparaciones",                     label: "Reparaciones" },
  { value: "recursos_humanos",                 label: "Recursos Humanos" },
  { value: "seguridad_e_higiene",              label: "Seguridad e Higiene" },
  { value: "servicio_tecnico_telefonico",      label: "Servicio Técnico Telefónico" },
  { value: "soporte_tecnico_presencial",       label: "Soporte Técnico Presencial" },
  { value: "ventas_de_refacciones_y_servicios",label: "Ventas de Refacciones y Servicios" },
];

const areaLabel = (value: string) =>
  areasLideres.find((a) => a.value === value)?.label ?? value.replace(/_/g, ' ');

type Lider = {
  id: number | string;
  nombre: string;
  correo: string;
  area?: string;
  activo?: boolean;
  jerarquia?: string;
  telefono?: string;
};

type LiderForm = {
  nombre: string;
  area: string;
  correo: string;
  jerarquia: string;
  activo: boolean;
  telefono: string;
};

const emptyForm: LiderForm = { nombre: '', area: '', correo: '', jerarquia: '', activo: true, telefono: '' };
const jerarquias = ["Empleado", "Lider", "Gerente"];
type Gerentes = string[];

// Paletas dinámicas para modo claro/oscuro
const dynamicColor = (str: string, isDark: boolean) => {
  const paletteLight = ["#1976d2", "#0288d1", "#2e7d32", "#f57c00", "#6a1b9a"];
  const paletteDark = ["#90caf9", "#80deea", "#a5d6a7", "#ffcc80", "#ce93d8"];
  const palette = isDark ? paletteDark : paletteLight;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

const getInitials = (name: string = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");

const getChipColor = (count: number) => {
  if (count > 20) return "success";
  if (count > 10) return "primary";
  return "default";
};

export const LideresGeneral: React.FC = () => {
  const { mode } = useContext(ColorModeContext);
  const [loadingLideres, setLoadingLideres] = useState(true);
  const [loadingGerentes, setLoadingGerentes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryLideres, setQueryLideres] = useState("");
  const [queryGerentes, setQueryGerentes] = useState("");
  const [usuariosPermitidos, setUsuariosPermitidos] = useState<string[]>([]);
  const [usuariosSidebar, setUsuariosSidebar] = useState<Lider[]>([]);

  // Auth
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [userArea, setUserArea] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<LiderForm>(emptyForm);
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingLider, setEditingLider] = useState<Lider | null>(null);
  const [editForm, setEditForm] = useState<LiderForm>(emptyForm);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserEmail(user.email ?? null);
        try {
          const q = query(collection(db, "usuarios"), where("correo", "==", user.email));
          const snap = await getDocs(q);
          if (!snap.empty) setUserArea(snap.docs[0].data().area ?? null);
        } catch { /* ignorar */ }
      } else {
        setCurrentUserEmail(null);
        setUserArea(null);
      }
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  const normalizarArea = (a: string) =>
    a.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "_");

  const isAuthorized =
    currentUserEmail === 'developer@asiarobotica.com' || currentUserEmail === 'marada@asiarobotica.com' ||
    normalizarArea(userArea ?? '') === 'recursos_humanos';

  useEffect(() => {
    const fetchLideres = async () => {
      try {
        const { data } = await axios.get<Lider[]>(
          "https://desarrollotecnologicoar.com/api3/lideres_inmediatos/"
        );
        setUsuariosSidebar(data ?? []);
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
        setError((prev) => prev ?? "Error al cargar gerentes.");
      } finally {
        setLoadingGerentes(false);
      }
    };
    fetchLideres();
    fetchGerentes();
  }, []);

  const filteredGerentes = useMemo(() => {
    const q = queryGerentes.trim().toLowerCase();
    if (!q) return usuariosPermitidos;
    return usuariosPermitidos.filter((g) => g.toLowerCase().includes(q));
  }, [usuariosPermitidos, queryGerentes]);

  const filteredLideres = useMemo(() => {
    const q = queryLideres.trim().toLowerCase();
    if (!q) return usuariosSidebar;
    return usuariosSidebar.filter(
      (l) =>
        l.nombre?.toLowerCase().includes(q) ||
        l.correo?.toLowerCase().includes(q) ||
        l.area?.toLowerCase().includes(q) ||
        l.jerarquia?.toLowerCase().includes(q)
    );
  }, [usuariosSidebar, queryLideres]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback opcional
    }
  };
  const handleCreate = async () => {
    if (!createForm.nombre.trim() || !createForm.area.trim()) {
      setError("Nombre y área son requeridos.");
      return;
    }
    setCreating(true);
    try {
      const { data } = await axios.post<Lider>(
        "https://desarrollotecnologicoar.com/api3/lideres_incidencias/",
        {
          nombre: createForm.nombre.trim(),
          area: createForm.area.trim(),
          correo: createForm.correo.trim() || undefined,
          jerarquia: createForm.jerarquia || undefined,
          activo: createForm.activo,
          telefono: createForm.telefono.trim() || undefined,
        }
      );
      setUsuariosSidebar((prev) => [...prev, data]);
      setCreateOpen(false);
      setCreateForm(emptyForm);
    } catch {
      setError("Error al crear el líder.");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (lider: Lider) => {
    setEditingLider(lider);
    setEditForm({
      nombre: lider.nombre ?? '',
      area: lider.area ?? '',
      correo: lider.correo ?? '',
      jerarquia: lider.jerarquia ?? '',
      activo: lider.activo ?? true,
      telefono: lider.telefono ?? '',
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingLider) return;
    if (!editForm.nombre.trim() || !editForm.area.trim()) {
      setError("Nombre y área son requeridos.");
      return;
    }
    setUpdating(true);
    try {
      const { data } = await axios.put<Lider>(
        `https://desarrollotecnologicoar.com/api3/lideres_incidencias/${editingLider.id}`,
        {
          nombre: editForm.nombre.trim(),
          area: editForm.area.trim(),
          activo: editForm.activo,
          correo: editForm.correo.trim() || undefined,
          jerarquia: editForm.jerarquia || undefined,
          telefono: editForm.telefono.trim() || undefined,
        }
      );
      setUsuariosSidebar((prev) =>
        prev.map((l) => (l.id === editingLider.id ? { ...l, ...data } : l))
      );
      setEditOpen(false);
      setEditingLider(null);
    } catch {
      setError("Error al actualizar el líder.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!isAuthorized) return;
    if (!window.confirm("¿Seguro que deseas eliminar este líder?")) return;
    try {
      await axios.delete(`https://desarrollotecnologicoar.com/api3/lideres_incidencias/${id}/`);
      setUsuariosSidebar((prev) => prev.filter((l) => l.id !== id));
    } catch {
      setError("Error al eliminar el líder. Intenta nuevamente.");
    }
  };

  if (loadingAuth) {
    return <Box sx={{ p: 2 }}><LinearProgress /></Box>;
  }

  if (!isAuthorized) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10, gap: 2 }}>
        <Typography variant="h6" color="text.secondary">Sin acceso</Typography>
        <Typography variant="body2" color="text.secondary">
          Solo el equipo de Recursos Humanos puede administrar esta sección.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>

      {/* Header */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip icon={<GroupsIcon />} label={`${filteredLideres.length} líderes`} size="small" color="primary" variant="outlined" />
          <Chip icon={<SupervisorAccountIcon />} label={`${usuariosPermitidos.length} gerentes`} size="small" color="warning" variant="outlined" />
        </Stack>
        {isAuthorized && (
          <Button variant="contained" startIcon={<AddIcon />} size="small"
            onClick={() => { setCreateForm(emptyForm); setCreateOpen(true); }}>
            Agregar Líder
          </Button>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Buscador */}
      <TextField
        fullWidth size="small"
        placeholder="Buscar por nombre, correo, área o jerarquía…"
        value={queryLideres}
        onChange={(e) => setQueryLideres(e.target.value)}
        InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
        sx={{ mb: 1.5 }}
      />

      {(loadingLideres || loadingGerentes) && <LinearProgress sx={{ mb: 1 }} />}

      {/* Tabla única */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 580 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Área</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Jerarquía</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Correo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Teléfono</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Activo</TableCell>
                {isAuthorized && <TableCell sx={{ fontWeight: 700 }} align="right">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingLideres
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: isAuthorized ? 7 : 6 }).map((__, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : filteredLideres.map((lider) => {
                    const bg1 = dynamicColor(lider.nombre || lider.correo, mode === "dark");
                    const bg2 = dynamicColor(lider.correo, mode !== "dark");
                    return (
                      <TableRow key={lider.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ py: 0.75 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar sx={{
                              width: 26, height: 26, fontSize: 11, flexShrink: 0,
                              background: `linear-gradient(135deg, ${bg1}, ${bg2})`,
                              color: '#fff', fontWeight: 700,
                            }}>
                              {getInitials(lider.nombre || lider.correo)}
                            </Avatar>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                              {lider.nombre}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150, fontSize: 12 }}>
                            {areaLabel(lider.area ?? '')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Chip label={lider.jerarquia || '—'} size="small" variant="outlined"
                            sx={{ fontSize: 11, height: 20 }} />
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }} noWrap>
                              {lider.correo || '—'}
                            </Typography>
                            {lider.correo && (
                              <Tooltip title="Copiar">
                                <IconButton size="small" onClick={() => copy(lider.correo)} sx={{ p: 0.2 }}>
                                  <ContentCopyIcon sx={{ fontSize: 12 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {lider.telefono || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }} align="center">
                          <Chip
                            label={lider.activo ? 'Sí' : 'No'}
                            size="small"
                            color={lider.activo ? 'success' : 'default'}
                            sx={{ fontSize: 11, height: 20 }}
                          />
                        </TableCell>
                        {isAuthorized && (
                          <TableCell sx={{ py: 0.75 }} align="right">
                            <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                              <Tooltip title="Editar">
                                <IconButton size="small" color="primary" onClick={() => handleOpenEdit(lider)}>
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Eliminar">
                                <IconButton size="small" color="error" onClick={() => handleDelete(lider.id)}>
                                  <FaRegTrashCan size={14} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
              {!loadingLideres && filteredLideres.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAuthorized ? 7 : 6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">Sin resultados.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Última actualización: {new Date().toLocaleString()}
      </Typography>

      {/* ── DIALOG CREAR */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Agregar Líder</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Nombre completo" value={createForm.nombre} required fullWidth
              onChange={(e) => setCreateForm((p) => ({ ...p, nombre: e.target.value }))} />
            <FormControl fullWidth required>
              <InputLabel>Área</InputLabel>
              <MuiSelect label="Área" value={createForm.area}
                onChange={(e) => setCreateForm((p) => ({ ...p, area: e.target.value }))}>
                {areasLideres.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </MuiSelect>
            </FormControl>
            <TextField label="Correo electrónico" type="email" value={createForm.correo} fullWidth
              onChange={(e) => setCreateForm((p) => ({ ...p, correo: e.target.value }))} />
            <TextField label="Teléfono" value={createForm.telefono} fullWidth
              onChange={(e) => setCreateForm((p) => ({ ...p, telefono: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>Jerarquía</InputLabel>
              <MuiSelect label="Jerarquía" value={createForm.jerarquia}
                onChange={(e) => setCreateForm((p) => ({ ...p, jerarquia: e.target.value }))}>
                {jerarquias.map((j) => <MenuItem key={j} value={j}>{j}</MenuItem>)}
              </MuiSelect>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={createForm.activo}
                onChange={(e) => setCreateForm((p) => ({ ...p, activo: e.target.checked }))} />}
              label="Activo"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>
            {creating ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── DIALOG EDITAR */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Editar Líder</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Nombre completo" value={editForm.nombre} required fullWidth
              onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))} />
            <FormControl fullWidth required>
              <InputLabel>Área</InputLabel>
              <MuiSelect label="Área"
                value={areasLideres.some((o) => o.value === editForm.area) ? editForm.area : ''}
                onChange={(e) => setEditForm((p) => ({ ...p, area: e.target.value }))}>
                {areasLideres.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </MuiSelect>
            </FormControl>
            <TextField label="Correo electrónico" type="email" value={editForm.correo} fullWidth
              onChange={(e) => setEditForm((p) => ({ ...p, correo: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>Jerarquía</InputLabel>
              <MuiSelect label="Jerarquía" value={editForm.jerarquia}
                onChange={(e) => setEditForm((p) => ({ ...p, jerarquia: e.target.value }))}>
                {jerarquias.map((j) => <MenuItem key={j} value={j}>{j}</MenuItem>)}
              </MuiSelect>
            </FormControl>
            <TextField label="Teléfono" value={editForm.telefono} fullWidth
              onChange={(e) => setEditForm((p) => ({ ...p, telefono: e.target.value }))} />
            <FormControlLabel
              control={<Switch checked={editForm.activo}
                onChange={(e) => setEditForm((p) => ({ ...p, activo: e.target.checked }))} />}
              label="Activo"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={updating}>Cancelar</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={updating}>
            {updating ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

