#!/usr/bin/env python3
"""Actualiza el motor del constructor desde BF6 Weapon Analyzer.

Uso:
    git clone --depth 1 https://github.com/raymdl/BF6-Weapon-Analyzer /tmp/analizador
    python3 scripts/actualizar_motor.py /tmp/analizador

Hace tres cosas:
  1. Copia los archivos del motor (sim/*.js) a motor/sim/, sin modificarlos.
  2. Junta los datos del juego que usa el motor en motor/datos-juego.json.
  3. Agrega a data/accesorios.json los accesorios nuevos. Las traducciones que
     ya existen no se tocan.

El código y los datos del analizador son de Raymdl y se usan con su permiso.
"""
import json, shutil, subprocess, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SIM = ['required-data.js', 'fire-modes.js', 'core.js', 'damage.js', 'attachments.js',
       'loadout.js', 'applyAttachments.js', 'weapon-attributes.js', 'soldier-classes.js']
DATOS = {
    'weapons': 'weapons.json', 'attachments': 'attachments.json', 'ammo': 'ammo.json',
    'balance': 'balance_tables.json', 'recoilDecay': 'recoil_decay.json', 'hitZones': 'hit_zones.json',
    'weaponAttributes': 'weapon_attributes.json', 'tooltips': 'attachment-tooltips.json',
}

# Traducciones propuestas. El panel guarda la definitiva en data/accesorios.json.
PROPUESTAS = {
    # Boca
    'CQB Suppressor': 'Supresor CQB', 'Compensated Brake': 'Freno compensado', 'Compensator': 'Compensador',
    'Double-Port Brake': 'Freno de doble puerto', 'Multi-Port Brake': 'Freno multipuerto', 'Flash Comp': 'Compensador apagallamas',
    'Flash Hider': 'Apagallamas', 'Hybrid Suppressor K': 'Supresor híbrido K', 'Hybrid Suppressor L': 'Supresor híbrido L',
    'Hybrid Suppressor S': 'Supresor híbrido S', 'Lightened Suppressor': 'Supresor aligerado', 'Linear Comp': 'Compensador lineal',
    'Long Suppressor': 'Supresor largo', 'Single-Port Brake': 'Freno de un puerto', 'Slant Brake': 'Freno inclinado',
    'Standard Suppressor': 'Supresor estándar', 'Thread Protector': 'Protector de rosca', 'Triple-Port Brake': 'Freno de triple puerto',
    # Cañón
    'Basic': 'Básico', 'Short': 'Corto', 'Extended': 'Extendido', 'Heavy': 'Pesado', 'Heavy Extended': 'Pesado extendido',
    'Light': 'Ligero', 'Cryogenic': 'Criogénico', 'Extended Light': 'Ligero extendido', 'Short Light': 'Ligero corto',
    'Suppressed': 'Con supresor',
    # Cañón inferior
    'Factory Angled': 'Angular de fábrica', 'Compact Handstop': 'Tope de mano compacto', 'Slim Handstop': 'Tope de mano delgado',
    'Folding Vertical': 'Vertical plegable', 'Alloy Vertical': 'Vertical de aleación', 'Ribbed Vertical': 'Vertical estriada',
    '6H64 Vertical': 'Vertical 6H64', 'Classic Vertical': 'Vertical clásica', 'Rubberized Vertical': 'Vertical engomada', 'Canted Vertical': 'Vertical inclinada',
    'Folding Stubby': 'Corta plegable', 'Ribbed Stubby': 'Corta estriada', 'Canted Stubby': 'Corta inclinada',
    'Stippled Stubby': 'Corta texturizada', 'Low-Profile Stubby': 'Corta de perfil bajo', 'Adjustable Angled': 'Angular ajustable',
    'Slim Angled': 'Angular delgada', 'Full Angled': 'Angular completa', 'Underslung Mount': 'Montura inferior',
    'Bipod': 'Bípode', 'PTT Grip Pod': 'Empuñadura bípode PTT', 'QD Grip Pod': 'Empuñadura bípode QD',
    'Classic Grip Pod': 'Empuñadura bípode clásica', 'Actuated Module': 'Módulo accionado',
    # Láser
    '5 MW Red': 'Rojo 5 MW', '5 MW Green': 'Verde 5 MW', '50 MW Green': 'Verde 50 MW', '50 MW Blue': 'Azul 50 MW',
    '50 MW Violet': 'Violeta 50 MW', '120 MW Blue': 'Azul 120 MW', 'Combo Red': 'Combo rojo', 'Combo Green': 'Combo verde',
    # Luz
    'Flashlight': 'Linterna', 'Range Finder': 'Telémetro', 'Taclight - Aimed': 'Luz táctica (apuntando)',
    'Taclight - Hipfire': 'Luz táctica (cadera)',
    # Ergonomía
    'Rail Cover': 'Cubierta de riel', 'Magwell Flare': 'Brocal ensanchado', 'Improved Mag Catch': 'Retén de cargador mejorado',
    'Match Trigger': 'Gatillo de competición', 'DLC Bolt': 'Cerrojo DLC', 'Aftermarket Buffer': 'Amortiguador mejorado',
    'A3 Receiver': 'Receptor A3', 'Speed Holster': 'Funda rápida', 'Gunslinger': 'Pistolero',
    'Burst Training': 'Entrenamiento de ráfaga', 'Burst Mode': 'Modo ráfaga', 'Folding Stock': 'Culata plegable',
    # Accesorio óptico
    'Canted Iron Sights': 'Miras de hierro inclinadas', 'Secondary Optic': 'Mira secundaria',
    'Anti-Glare Coating': 'Recubrimiento antirreflejos',
    # Munición
    'Standard': 'Estándar', 'Penetration': 'Perforante', 'Lightweight': 'Ligera', 'Long-Range': 'Largo alcance',
    'Hollow Point': 'Punta hueca', 'Frangible': 'Fragmentable', 'Synthetic': 'Sintética', '#01 BUCK': 'Perdigón #01',
    '#00 BUCK': 'Perdigón #00', 'Flechette': 'Dardos', 'Slugs': 'Balas sólidas', 'Subsonic': 'Subsónica',
    'Sub HP': 'Subsónica punta hueca', 'Supersonic FMJ': 'FMJ supersónica', 'Sub Pen': 'Subsónica perforante', 'Range Pen': 'Perforante de largo alcance',
    # Mira
    'Iron Sights': 'Miras de hierro', 'Single Shot': 'Disparo único',
}

GRUPO = {'SIGHTS': 'mira', 'ACCESSORIES': 'accesorioOptico', 'MUZZLES': 'boca', 'BARRELS': 'canon', 'GRIPS': 'canonInferior',
         'LASERS': 'laser', 'LIGHTS': 'luz', 'ERGOS': 'ergonomia'}


def propuesta(nombre):
    if nombre in PROPUESTAS:
        return PROPUESTAS[nombre]
    partes = nombre.split(' ')
    if len(partes) == 2 and partes[0].isdigit():
        return {'Rnd': f'{partes[0]} balas', 'Fast': f'{partes[0]} rápido', 'Agil': f'{partes[0]} ágil'}.get(partes[1], nombre)
    return nombre  # nombres de modelo (miras, etc.) quedan igual


def main(origen):
    origen = Path(origen)
    destino_sim = RAIZ / 'motor' / 'sim'
    destino_sim.mkdir(parents=True, exist_ok=True)
    for f in SIM:
        shutil.copy2(origen / 'sim' / f, destino_sim / f)

    datos = {k: json.load(open(origen / 'data' / f, encoding='utf-8')) for k, f in DATOS.items()}
    try:
        commit = subprocess.run(['git', '-C', str(origen), 'log', '-1', '--format=%h %cs'], capture_output=True, text=True).stdout.strip()
    except OSError:
        commit = ''
    version = datos['weaponAttributes'].get('sourceVersion', '')
    datos['origen'] = {'analizador': 'https://github.com/raymdl/BF6-Weapon-Analyzer', 'commit': commit, 'versionJuego': version}
    with open(RAIZ / 'motor' / 'datos-juego.json', 'w', encoding='utf-8') as f:
        json.dump(datos, f, ensure_ascii=False, separators=(',', ':'))

    # Tabla de nombres para traducir (una entrada por nombre en inglés).
    ruta = RAIZ / 'data' / 'accesorios.json'
    tabla = json.load(open(ruta, encoding='utf-8')) if ruta.exists() else {'formato': 1, 'nombres': {}}
    nombres = tabla.setdefault('nombres', {})
    vistos = {}
    att = datos['attachments']
    for cat, grupo in GRUPO.items():
        for a in att[cat]:
            if a['id'] == 'none' or a.get('legacy'):
                continue
            vistos.setdefault(a['name'], grupo)
            for o in (a.get('weaponOverrides') or {}).values():
                if isinstance(o, dict) and o.get('name'):
                    vistos.setdefault(o['name'], grupo)
    for w in att['WEAPON_MAG'].values():
        for m in w['mags'].values():
            vistos.setdefault(m['name'], 'cargador')
    for a in datos['ammo']['AMMO']:
        vistos.setdefault(a['name'], 'municion')
    nuevos = 0
    for nombre, grupo in vistos.items():
        if nombre not in nombres:
            nombres[nombre] = {'grupo': grupo, 'es': propuesta(nombre), 'revisado': False}
            nuevos += 1
        else:
            nombres[nombre].setdefault('grupo', grupo)
    tabla['nombres'] = dict(sorted(nombres.items(), key=lambda kv: (kv[1]['grupo'], kv[0].lower())))
    tabla['versionJuego'] = version
    with open(ruta, 'w', encoding='utf-8') as f:
        json.dump(tabla, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'Motor copiado ({commit}, juego {version}). Nombres: {len(vistos)} en total, {nuevos} nuevos.')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
