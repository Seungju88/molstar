import streamlit as st
import streamlit.components.v1 as components
import base64
import os

# 페이지 제목 설정
st.set_page_config(page_title="The Viewer")
st.title("The Viewer")

# 업로드된 파일을 저장할 디렉토리 생성 (존재하지 않으면 생성)
upload_dir = "uploaded_files"
os.makedirs(upload_dir, exist_ok=True)

# 3개의 탭 생성: Default view, View Docking, View Trajectory
tabs = st.tabs(["Default view", "View Docking", "View Trajectory"])

###########################################
# Tab 1: Default view (PDB 파일 하나를 Mol*로 시각화)
###########################################
with tabs[0]:
    st.header("Default view")
    default_file = st.file_uploader("Upload a PDB file", type=["pdb"], key="default_pdb")
    if default_file is not None:
        file_path = os.path.join(upload_dir, default_file.name)
        with open(file_path, "wb") as f:
            f.write(default_file.getbuffer())
        try:
            with open(file_path, "r") as f:
                pdb_text = f.read()
        except Exception as e:
            st.error(f"Error reading PDB file: {e}")
        else:
            pdb_b64 = base64.b64encode(pdb_text.encode("utf-8")).decode("utf-8")

        html_default = f"""
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <title>Mol* Default View</title>
        <style>
            html, body, #app {{
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            }}
        </style>
        <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
        <script src="https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.js"></script>
        <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
        <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.css" />
        </head>

        <body>
        <script type="text/javascript" src="./molstar.js"></script>
        <div id="app"></div>
        <script type="text/javascript">
            // function getParam(name, regex) {{
            //     var r = new RegExp(name + '=' + '(' + regex + ')[&]?', 'i');
            //     return decodeURIComponent(((window.location.search || '').match(r) || [])[1] || '');
            // }}
            // var pdbqt = getParam('pdbqt', '[^&]+').trim() || './examples/ace2.pdbqt';
            // var mol2 = getParam('mol2', '[^&]+').trim() || './examples/ace2-hit.mol2';
            // var pdb = getParam('pdb', '[^&]+').trim() || './uploaded_files/1cbs.pdb';

            var pdbt = atob("{ pdb_b64 }");

            molstar.Viewer.create('app', {{
                layoutIsExpanded: false,
                layoutShowControls: false,
                layoutShowRemoteState: false,
                layoutShowSequence: true,
                layoutShowLog: false,
                layoutShowLeftPanel: true,

                viewportShowExpand: true,
                viewportShowSelectionMode: false,
                viewportShowAnimation: false,
            
                }}).then(viewer => {{
                    // viewer.loadPdb(pdb, {{ key: 6 }});
                    // viewer.loadStructureFromUrl(pdb, format='pdb' , {{ key: 6 }}
                    viewer.loadStructureFromData(pdbt, foramt='pdb', 1);
            }});
        </script>
        </body>
        </html>
        """
        components.html(html_default, height=450)
    else:
        st.info("Upload a PDB file to visualize the structure.")


###########################################
# Tab 2: View Docking (PDB + SDF 파일을 동시에 로드)
###########################################
with tabs[1]:
    st.header("View Docking")
    pdb_file = st.file_uploader("Upload a PDB file", type=["pdb"], key="docking_pdb")
    sdf_file = st.file_uploader("Upload a SDF file", type=["sdf"], key="docking_sdf")
    if pdb_file is not None and sdf_file is not None:
        pdb_path = os.path.join(upload_dir, pdb_file.name)
        sdf_path = os.path.join(upload_dir, sdf_file.name)
        with open(pdb_path, "wb") as f:
            f.write(pdb_file.getbuffer())
        with open(sdf_path, "wb") as f:
            f.write(sdf_file.getbuffer())
        try:
            with open(pdb_path, "r") as f:
                pdb_text = f.read()
        except Exception as e:
            st.error(f"Error reading PDB file: {e}")
        else:
            pdb_b64 = base64.b64encode(pdb_text.encode("utf-8")).decode("utf-8")
        try:
            with open(sdf_path, "r") as f:
                sdf_text = f.read()
        except Exception as e:
            st.error(f"Error reading SDF file: {e}")
        else:
            sdf_b64 = base64.b64encode(sdf_text.encode("utf-8")).decode("utf-8")
        
        html_docking = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Mol* Docking View</title>
          <style>
            html, body, #app {{
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
            }}
          </style>
            <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
            <script src="https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.js"></script>
            <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
            <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.css" />
        </head>

        <body>
          <div id="app"></div>
          </style>
        <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
        <script src="https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.js"></script>
        <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
        <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.css" />
        </head>

        <body>
        <script type="text/javascript" src="./molstar.js"></script>
        <div id="app"></div>
        <script type="text/javascript">
            var pdbt = atob("{ pdb_b64 }");
            var sdft = atob("{ sdf_b64 }");

            molstar.Viewer.create('app', {{
                layoutIsExpanded: false,
                layoutShowControls: false,
                layoutShowRemoteState: false,
                layoutShowSequence: true,
                layoutShowLog: false,
                layoutShowLeftPanel: true,

                viewportShowExpand: true,
                viewportShowSelectionMode: false,
                viewportShowAnimation: false,
            
                }}).then(viewer => {{
                    viewer.loadStructureFromData(pdbt, foramt='pdb', 1, {{ representationPreset: "cartoon" }}),
                    viewer.loadStructureFromData(sdft, foramt='sdf', 1, {{ representationPreset: "ball+stick" }});
            }});
        </script>
        </body>
        </html>
        """
        components.html(html_docking, height=450)
    else:
        st.info("Upload both PDB and SDF files to visualize docking.")

###########################################
# Tab 3: View Trajectory (PDB + XTC 파일을 이용한 궤적 시각화)
###########################################
with tabs[2]:
    st.header("View Trajectory")
    pdb_traj_file = st.file_uploader("Upload a PDB file", type=["pdb"], key="traj_pdb")
    xtc_file = st.file_uploader("Upload an XTC file", type=["xtc"], key="traj_xtc")
    if pdb_traj_file is not None and xtc_file is not None:
        pdb_traj_path = os.path.join(upload_dir, pdb_traj_file.name)
        xtc_path = os.path.join(upload_dir, xtc_file.name)
        with open(pdb_traj_path, "wb") as f:
            f.write(pdb_traj_file.getbuffer())
        with open(xtc_path, "wb") as f:
            f.write(xtc_file.getbuffer())
        try:
            with open(pdb_traj_path, "r") as f:
                pdb_traj_text = f.read()
        except Exception as e:
            st.error(f"Error reading PDB file: {e}")
        else:
            pdb_traj_b64 = base64.b64encode(pdb_traj_text.encode("utf-8")).decode("utf-8")
        try:
            with open(xtc_path, "rb") as f:
                xtc_data = f.read()
        except Exception as e:
            st.error(f"Error reading XTC file: {e}")
        else:
            xtc_b64 = base64.b64encode(xtc_data).decode("utf-8")
        
        html_trajectory = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Mol* Trajectory View</title>
          <style>
            html, body, #app {{
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
            }}
          </style>
            <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
            <script src="https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.js"></script>
            <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
            <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.css" />
        </head>

        <body>
          <div id="app"></div>
          </style>
        <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
        <script src="https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.js"></script>
        <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
        <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.css" />
        </head>

        <body>
        <script type="text/javascript" src="./molstar.js"></script>
        <div id="app"></div>
        <script type="text/javascript">
            var pdbText = atob("{ pdb_traj_b64 }");
            // var pdbBlob = new Blob([pdbText], {{ type: 'text/plain' }});
            // var pdbUrl = URL.createObjectURL(pdbBlob);

            var xtcData = atob("{xtc_b64}");
            var xtcBytes = new Uint8Array(xtcData.length);
            for (var i = 0; i < xtcData.length; i++) {{
                xtcBytes[i] = xtcData.charCodeAt(i);
            }}
            // var xtcBlob = new Blob([xtcData], {{ type: 'application/octet-stream' }});
            // var xtcUrl = URL.createObjectURL(xtcBlob);
            
            molstar.Viewer.create('app', {{
                layoutIsExpanded: false,
                layoutShowControls: false,
                layoutShowRemoteState: true,
                layoutShowSequence: true,
                layoutShowLog: false,
                layoutShowLeftPanel: true,

                viewportShowExpand: true,
                viewportShowSelectionMode: true,
                viewportShowAnimation: true,
                
            }}).then(viewer => {{
                viewer.loadTrajectory({{
                        model: {{ kind: 'model-data', data: pdbText, format: 'pdb' }},
                        coordinates: {{ kind: 'coordinates-data', data: xtcBytes, format: 'xtc', isBinary: true }},
                        // preset: 'all-models'
                    }});
                }});

        </script>
        </body>
        </html>"""
        components.html(html_trajectory, height=450)
    else:
        st.info("Upload both PDB and XTC files to visualize the trajectory.")
