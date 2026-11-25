        <!-- Modal de Nova Solicitação de Reserva -->
        <div id="modalReserva" class="modal-overlay">
            <div class="modal-conteudo">
                <h2>Nova solicitação</h2>

                <form id="formReserva">
                    <div class="form-grupo">
                        <label for="professor">Professor responsável pela aula</label>
                        <select id="professor" required>
                            <option value="">Selecione o professor</option>
                        </select>
                    </div>

                    <div class="form-grupo">
                        <label for="curso">Curso</label>
                        <select id="curso" required>
                            <option value="">Selecione o curso</option>
                            <option value="Engenharia Química">Engenharia Química</option>
                            <option value="Engenharia Civil">Engenharia Civil</option>
                            <option value="Engenharia Mecânica">Engenharia Mecânica</option>
                            <option value="Engenharia Eletrica">Engenharia Eletrica</option>
                            <option value="Engenharia de Produção">Engenharia de Produção</option>
                            <option value="Biomedicina">Biomedicina</option>
                            <option value="Farmácia">Farmácia</option>
                            <option value="Medicina Veterinária">Medicina Veterinária</option>
                            <option value="Nutrição">Nutrição</option>
                            <option value="Eventos">Eventos</option>
                        </select>
                    </div>

                    <div class="form-grupo">
                        <label for="turma">Turma</label>
                        <input id="turma" type="text" required placeholder="Ex: CC3A">
                    </div>

                    <div class="form-grupo">
                        <label for="materia">Disciplina</label>
                        <select id="materia" required>
                            <option value="">Selecione a disciplina</option>
                            <option value="Química Ambiental">Química Ambiental</option>
                            <option value="Química Analítica">Química Analítica</option>
                            <option value="Fundamentos da Química">Fundamentos da Química</option>
                            <option value="Química Orgânica">Química Orgânica</option>
                            <option value="Química Geral">Química Geral</option>
                            <option value="Métodos Analíticos">Métodos Analíticos</option>
                            <option value="Química Inorgânica">Química Inorgânica</option>
                            <option value="Análise Instrumental">Análise Instrumental</option>
                            <option value="Diagnóstico Ambiental">Diagnóstico Ambiental</option>
                            <option value="Propriedade físico-química dos materiais">Propriedade físico-química dos materiais</option>
                            <option value="Tecnologia dos alimentos">Tecnologia dos alimentos</option>
                            <option value="Biotecnologia da fermentação">Biotecnologia da fermentação</option>
                            <option value="Outro">Outro</option>
                        </select>
                    </div>
                        <div class="form-grupo">
                            <label for="anexoMateriais">Requisição de materiais e reagentes</label>
                            <input id="anexoMateriais" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" />
                        </div>
                        <div class="form-grupo">
                            <label for="anexoPop">POP da aula</label>
                            <input id="anexoPop" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" />
                        </div>
                    <div class="form-grupo" id="grupoQuantidadeLabs">
                        <label for="quantidadeLabs">Quantidade de laboratórios necessários</label>
                        <select id="quantidadeLabs" required>
                            <option value="1">1 laboratório</option>
                            <option value="2">2 laboratórios</option>
                            <option value="3">3 laboratórios</option>
                            <option value="4">4 laboratórios</option>
                            <option value="5">5 laboratórios</option>
                        </select>
                    </div>
                    <div class="form-grupo">
                        <label class="opcao-lab-engenharia">
                            <input id="usarLabEngenharia" type="checkbox" style="width:auto;">
                            <span>Incluir o Lab de Engenharia <small>(equipamentos industriais)</small></span>
                        </label>
                    </div>

                    <!-- Campos dinâmicos para professores extras caso quantidade > 1 -->
                    <div id="professoresExtras"></div>

                    <div class="form-grupo">
                        <label for="periodoReserva">Período</label>
                        <select id="periodoReserva" required>
                            <option value="manha">Manhã</option>
                            <option value="noite">Noite</option>
                        </select>
                    </div>

                    <hr>

                    <h3>Datas das aulas</h3>
                    <p style="font-size: 13px; color: #52657b;">Você pode adicionar várias datas para a mesma solicitação.</p>

                    <div class="form-grupo">
                        <label for="dataReserva">Escolher uma data</label>
                        <input id="dataReserva" type="date">
                    </div>

                    <button type="button" id="btnAdicionarData">
                        + Adicionar data
                    </button>

                    <ul id="listaDatas" class="lista-datas"></ul>

                    <div class="acoes-form">
                        <button type="submit" class="primario">
                            Cadastrar solicitação
                        </button>
                        <button type="button" id="btnCancelarModal">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>

