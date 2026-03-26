"""
config_alertas.py — Configuracion de umbrales de alertas
Lee/escribe un archivo JSON local para persistir cambios del usuario.
"""
import os
import json
import copy

_CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "alert_config.json")

DEFAULTS = {
    "phytophthora": {
        "h10_umbral_alto": 45,
        "h10_umbral_medio": 40,
        "h10_pts_alto": 15,
        "h10_pts_medio": 8,
        "h20_umbral_alto": 45,
        "h20_umbral_medio": 40,
        "h20_pts_alto": 15,
        "h20_pts_medio": 8,
        "temp_min_optima": 22,
        "temp_max_optima": 28,
        "temp_pts_optimo": 20,
        "temp_min_riesgo": 15,
        "temp_pts_riesgo": 10,
        "horas_humedo_critico": 72,
        "horas_humedo_alto": 48,
        "horas_humedo_medio": 24,
        "horas_humedo_pts_critico": 15,
        "horas_humedo_pts_alto": 10,
        "horas_humedo_pts_medio": 5,
        "umbral_vwc_humedo": 40,
        "precip_7d_alto": 50,
        "precip_7d_medio": 25,
        "precip_7d_pts_alto": 10,
        "precip_7d_pts_medio": 5,
        "pronostico_48h_umbral": 20,
        "pronostico_48h_pts": 5,
        "hr_48h_umbral": 80,
        "hr_48h_pts": 5,
        "nivel_critico": 76,
        "nivel_alto": 51,
        "nivel_moderado": 26,
    },
    "riego": {
        "breaking_point_vwc": 28,
        "lecturas_consecutivas": 2,
    },
    "offline": {
        "minutos_sin_datos": 30,
    },
    "bateria": {
        "voltaje_minimo": 3.3,
    },
}


def get_config() -> dict:
    """Lee la configuracion desde el archivo JSON. Devuelve defaults si no existe."""
    if os.path.exists(_CONFIG_PATH):
        try:
            with open(_CONFIG_PATH, "r") as f:
                stored = json.load(f)
            # Merge defaults for any missing keys
            merged = copy.deepcopy(DEFAULTS)
            for section, values in stored.items():
                if section in merged and isinstance(values, dict):
                    merged[section].update(values)
                else:
                    merged[section] = values
            return merged
        except (json.JSONDecodeError, IOError):
            return copy.deepcopy(DEFAULTS)
    return copy.deepcopy(DEFAULTS)


def _save_config(config: dict) -> None:
    """Guarda la configuracion al archivo JSON."""
    with open(_CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def update_config(section: str, data: dict) -> dict:
    """Actualiza una seccion de la configuracion y guarda."""
    config = get_config()
    if section not in config:
        raise KeyError(f"Seccion desconocida: {section}")
    config[section].update(data)
    _save_config(config)
    return config


def reset_config() -> dict:
    """Restaura la configuracion a los valores por defecto."""
    config = copy.deepcopy(DEFAULTS)
    _save_config(config)
    return config
