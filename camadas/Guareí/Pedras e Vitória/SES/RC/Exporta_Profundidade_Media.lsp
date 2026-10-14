;;; ==========================================================================
;;; ROTINA: Exporta_Profundidade_Media.lsp
;;; OBJETIVO: Calcular a Profundidade Média dos tubos (Pipes) do Civil 3D,
;;;           vincular tabela de Object Data para MAPEXPORT (SHP) e gerar
;;;           arquivo de texto/CSV compatível com o banco de dados Sabesp.
;;; ==========================================================================

(vl-load-com)

(defun c:EXPORTAPROFMEDIA ( / ss i ent obj pName pvM pvJ dia len slp zRimM zRimJ zInvM zInvJ profM profJ profMed
                              dwgName dwgDir outTxt f fileCount odTable tblDef)
  (princ "\nIniciando calculo de profundidade media da rede coletora...")
  
  ;; 1. Seleciona todos os tubos (AECC_PIPE)
  (setq ss (ssget "X" '((0 . "AECC_PIPE"))))
  (if (not ss)
    (progn
      (princ "\n[AVISO] Nenhum tubo (AECC_PIPE) encontrado no desenho!")
      (exit)
    )
  )

  (setq fileCount (sslength ss))
  (princ (strcat "\nForam encontrados " (itoa fileCount) " tubos."))

  ;; 2. Criar ou verificar Tabela de Object Data (AutoCAD Map 3D) para exportacao SHP
  (setq odTable "TUBOS_SES")
  (if (and ade_oddefinetab ade_odtablelist)
    (progn
      (if (not (vl-position odTable (ade_odtablelist)))
        (progn
          (setq tblDef
            (list
              (cons "TableName" odTable)
              (cons "TableDesc" "Dados dos Tubos de Esgoto com Profundidade Media")
              (cons "Columns"
                (list
                  (list (cons "ColName" "PIPE_NAME")  (cons "ColDesc" "Nome do Tubo")     (cons "ColType" "Character"))
                  (list (cons "ColName" "PV_MONT")    (cons "ColDesc" "PV Montante")      (cons "ColType" "Character"))
                  (list (cons "ColName" "PV_JUS")     (cons "ColDesc" "PV Jusante")       (cons "ColType" "Character"))
                  (list (cons "ColName" "DIAM_MM")    (cons "ColDesc" "Diametro (mm)")    (cons "ColType" "Real"))
                  (list (cons "ColName" "EXT_M")      (cons "ColDesc" "Extensao (m)")     (cons "ColType" "Real"))
                  (list (cons "ColName" "DECLIV_PCT") (cons "ColDesc" "Declividade (%)")  (cons "ColType" "Real"))
                  (list (cons "ColName" "PROF_INI")   (cons "ColDesc" "Prof Inicial (m)") (cons "ColType" "Real"))
                  (list (cons "ColName" "PROF_FIM")   (cons "ColDesc" "Prof Final (m)")   (cons "ColType" "Real"))
                  (list (cons "ColName" "PROF_MED")   (cons "ColDesc" "Prof Media (m)")   (cons "ColType" "Real"))
                )
              )
            )
          )
          (ade_oddefinetab tblDef)
          (princ (strcat "\nTabela de Object Data '" odTable "' criada com sucesso."))
        )
      )
    )
    (princ "\n[INFO] Modulo AutoCAD Map Object Data sera ignorado caso nao ativo.")
  )

  ;; 3. Preparar arquivo de saida TXT/CSV (padrao Sabesp pv_m;profund)
  (setq dwgDir (getvar "DWGPREFIX"))
  (setq dwgName (vl-filename-base (getvar "DWGNAME")))
  (setq outTxt (strcat dwgDir dwgName "_profundidades.txt"))
  (setq f (open outTxt "w"))
  (if f
    (write-line "pv_m;pv_j;nome_tubo;diam_mm;ext_m;decliv_pct;prof_ini;prof_fim;prof_med" f)
  )

  ;; 4. Percorrer os tubos e calcular
  (setq i 0)
  (while (< i fileCount)
    (setq ent (ssname ss i))
    (setq obj (vlax-ename->vla-object ent))
    
    (setq pName (vlax-get-property obj 'Name))
    
    ;; PV Montante e Jusante
    (setq pvM "SEM_PV" pvJ "SEM_PV" zRimM 0.0 zRimJ 0.0)
    (if (and (vlax-property-available-p obj 'StartStructure) (vlax-get-property obj 'StartStructure))
      (progn
        (setq pvM (vlax-get-property (vlax-get-property obj 'StartStructure) 'Name))
        (setq zRimM (vlax-get-property (vlax-get-property obj 'StartStructure) 'RimElevation))
      )
    )
    (if (and (vlax-property-available-p obj 'EndStructure) (vlax-get-property obj 'EndStructure))
      (progn
        (setq pvJ (vlax-get-property (vlax-get-property obj 'EndStructure) 'Name))
        (setq zRimJ (vlax-get-property (vlax-get-property obj 'EndStructure) 'RimElevation))
      )
    )

    ;; Cotas geratrizes e dimensoes
    (setq zInvM (vlax-get-property obj 'StartInvertElevation))
    (setq zInvJ (vlax-get-property obj 'EndInvertElevation))
    (setq len (vlax-get-property obj 'Length2D))
    (setq slp (* (vlax-get-property obj 'Slope) 100.0)) ; em %
    
    ;; Diametro interno (se < 5 metros assume que esta em metros e converte para mm)
    (setq dia (vlax-get-property obj 'InnerDiameterOrWidth))
    (if (< dia 5.0)
      (setq dia (* dia 1000.0))
    )

    ;; Profundidades (Tampa - Fundo) ou StartDepth nativo
    (if (vlax-property-available-p obj 'StartDepth)
      (setq profM (vlax-get-property obj 'StartDepth))
      (setq profM (- zRimM zInvM))
    )
    (if (vlax-property-available-p obj 'EndDepth)
      (setq profJ (vlax-get-property obj 'EndDepth))
      (setq profJ (- zRimJ zInvJ))
    )
    
    ;; Profundidade Media
    (setq profMed (/ (+ profM profJ) 2.0))

    ;; Grava no Object Data para exportar via MAPEXPORT
    (if (and ade_odaddrecord ade_odsetfield)
      (progn
        ;; Remove registro antigo da tabela se houver
        (if ade_oddelrecord
          (ade_oddelrecord ent odTable 0)
        )
        (ade_odaddrecord ent odTable)
        (ade_odsetfield ent odTable "PIPE_NAME" 0 pName)
        (ade_odsetfield ent odTable "PV_MONT" 0 pvM)
        (ade_odsetfield ent odTable "PV_JUS" 0 pvJ)
        (ade_odsetfield ent odTable "DIAM_MM" 0 dia)
        (ade_odsetfield ent odTable "EXT_M" 0 len)
        (ade_odsetfield ent odTable "DECLIV_PCT" 0 slp)
        (ade_odsetfield ent odTable "PROF_INI" 0 profM)
        (ade_odsetfield ent odTable "PROF_FIM" 0 profJ)
        (ade_odsetfield ent odTable "PROF_MED" 0 profMed)
      )
    )

    ;; Escreve no arquivo TXT/CSV
    (if f
      (write-line
        (strcat pvM ";" pvJ ";" pName ";"
                (rtos dia 2 0) ";"
                (rtos len 2 2) ";"
                (rtos slp 2 2) ";"
                (rtos profM 2 2) ";"
                (rtos profJ 2 2) ";"
                (rtos profMed 2 2))
        f
      )
    )

    (setq i (1+ i))
  )

  (if f (close f))

  (princ "\n--------------------------------------------------------------")
  (princ (strcat "\nProcessamento concluido para " (itoa fileCount) " tubos!"))
  (princ (strcat "\n1. Tabela de Object Data 'TUBOS_SES' preenchida em todos os tubos."))
  (princ (strcat "\n   -> Agora execute MAPEXPORT, selecione Linha e marque a tabela 'TUBOS_SES'."))
  (princ (strcat "\n2. Arquivo TXT/CSV gerado em: " outTxt))
  (princ "\n--------------------------------------------------------------\n")
  (princ)
)

(princ "\n[LISP CARREGADO] Digite EXPORTAPROFMEDIA para calcular e preparar dados para SHP.\n")
(princ)
