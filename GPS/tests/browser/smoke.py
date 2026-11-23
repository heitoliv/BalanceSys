import glob
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.ui import Select, WebDriverWait

BASE = os.environ.get("BALANCESYS_BROWSER_TEST_BASE", "http://localhost:3000/")
MAIL = str(Path(__file__).resolve().parents[2] / ".local" / "mail")
test_url = os.environ.get("TEST_DATABASE_URL", "")
if os.environ.get("BALANCESYS_BROWSER_TEST") != "1" or not urlparse(test_url).path.lstrip("/").startswith("balancesys_test_"):
    raise SystemExit("Execute apenas com BALANCESYS_BROWSER_TEST=1 e TEST_DATABASE_URL apontando para balancesys_test_*; inicie a API com o mesmo banco isolado.")
email_a = "browser-a-" + uuid.uuid4().hex + "@example.test"
email_b = "browser-b-" + uuid.uuid4().hex + "@example.test"
senha_a = "Aa1!" + secrets.token_urlsafe(8)
senha_b = "Bb1!" + secrets.token_urlsafe(8)
senha_nova = "Cc1!" + secrets.token_urlsafe(8)

def ultimo_link(email, acao):
    arquivos = sorted(glob.glob(MAIL + "/*.eml"), key=os.path.getmtime, reverse=True)
    for arquivo in arquivos:
        texto = open(arquivo, encoding="utf-8").read()
        if "To: " + email in texto and "acao=" + acao in texto:
            return re.search(r"https?://[^\s]+", texto).group(0)
    raise AssertionError("Mensagem local não recebida")

options = Options()
options.add_argument("-headless")
options.binary_location = "/run/current-system/sw/bin/firefox"
driver = webdriver.Firefox(service=Service(), options=options)
driver.set_window_size(1280, 900)
wait = WebDriverWait(driver, 12)

def el(selector):
    return driver.find_element(By.CSS_SELECTOR, selector)

def aguardar(texto, selector):
    try:
        wait.until(lambda d: texto in d.find_element(By.CSS_SELECTOR, selector).text)
    except Exception:
        print(f"Aguardado {texto!r} em {selector}; encontrado {el(selector).text!r}")
        driver.save_screenshot("/tmp/balancesys-browser-failure.png")
        raise

def digitar(selector, valor):
    campo = el(selector)
    campo.clear()
    campo.send_keys(valor)

def data(selector, valor):
    driver.execute_script("arguments[0].value=arguments[1]; arguments[0].dispatchEvent(new Event('change',{bubbles:true}));", el(selector), valor)

def cadastrar(email, senha):
    el("#auth-alternar").click()
    digitar("#auth-nome", "Pessoa de teste")
    digitar("#auth-email", email)
    digitar("#auth-senha", senha)
    digitar("#auth-confirmar", senha)
    el("#auth-enviar").click()
    aguardar("Conta criada", "#auth-mensagem")
    assert el("#auth-titulo").text == "Entrar"

def verificar(email):
    driver.get(ultimo_link(email, "verificar"))
    aguardar("Verificar e-mail", "#auth-titulo")
    el("#auth-enviar").click()
    aguardar("E-mail verificado", "#auth-mensagem")

def entrar(email, senha):
    digitar("#auth-email", email)
    digitar("#auth-senha", senha)
    el("#auth-enviar").click()
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, "#area-app").is_displayed())

def registrar(tipo, valor, dia, descricao, categoria):
    el("#bt-" + tipo).click()
    assert el("#campo-prioridade").is_displayed() == (tipo == "despesa")
    digitar("#f-valor", valor)
    data("#f-data", dia)
    digitar("#f-descricao", descricao)
    Select(el("#f-categoria")).select_by_visible_text(categoria)
    el("#bt-salvar").click()
    aguardar("Transação registrada", "#aviso")

try:
    driver.get(BASE)
    aguardar("Entrar", "#auth-titulo")
    el("#auth-alternar").click()
    digitar("#auth-senha", "abc")
    assert "ok" not in el('[data-regra="maiuscula"]').get_attribute("class").split()
    el('[data-campo="auth-senha"]').click()
    assert el("#auth-senha").get_attribute("type") == "text"
    assert el("#auth-senha").get_attribute("value") == "abc"
    assert el('[data-campo="auth-senha"]').get_attribute("aria-pressed") == "true"
    el('[data-campo="auth-senha"]').click()
    digitar("#auth-nome", "Pessoa de teste")
    digitar("#auth-email", email_a)
    digitar("#auth-senha", senha_a)
    digitar("#auth-confirmar", "diferente")
    el("#auth-enviar").click()
    aguardar("não coincidem", "#erro-confirmacao")
    digitar("#auth-confirmar", senha_a)
    el("#auth-enviar").click()
    aguardar("Conta criada", "#auth-mensagem")
    assert not el("#area-app").is_displayed()
    verificar(email_a)
    digitar("#auth-email", email_a)
    digitar("#auth-senha", "SenhaErrada!123")
    el("#auth-enviar").click()
    aguardar("E-mail ou senha incorretos", "#auth-mensagem")
    entrar(email_a, senha_a)
    el("#bt-conta").click()
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, "#area-conta").is_displayed())
    assert el("#conta-email").text == email_a
    assert el("#conta-verificacao").text == "E-mail verificado"
    el("#bt-recuperar-conta").click()
    aguardar("enviaremos um link", "#conta-mensagem")
    assert ultimo_link(email_a, "recuperar")
    el("#bt-inicio").click()
    hoje = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    primeiro = hoje.replace(day=1)
    anterior = primeiro - timedelta(days=1)
    mes_futuro = (hoje.year * 12 + hoje.month - 1 + 2)
    futuro = f"{mes_futuro // 12:04d}-{mes_futuro % 12 + 1:02d}-15"
    registrar("receita", "100,00", anterior.isoformat(), "Receita anterior", "Renda")
    el("#bt-metas").click()
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, "#area-metas").is_displayed())
    data("#meta-mes", hoje.strftime("%Y-%m"))
    Select(el("#meta-categoria")).select_by_visible_text("Lazer")
    digitar("#meta-limite", "100,00")
    el("#meta-salvar").click()
    aguardar("Meta criada", "#meta-aviso")
    el("#bt-inicio").click()
    registrar("despesa", "25,50", hoje.isoformat(), "Lazer de hoje", "Lazer")
    aguardar("Meta de Lazer", "#impacto-meta")
    aguardar("25,5%", "#impacto-meta")
    registrar("despesa", "54,50", hoje.isoformat(), "Complemento 80", "Lazer")
    aguardar("80%", "#impacto-meta")
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#alertas-metas-lista li")) == 1)
    registrar("despesa", "20,00", hoje.isoformat(), "Complemento 100", "Lazer")
    aguardar("100%", "#impacto-meta")
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#alertas-metas-lista li")) == 2)
    driver.find_element(By.XPATH, "//tr[td[contains(., 'Complemento 100')]]//button[contains(@class,'lixo')]").click()
    driver.switch_to.alert.accept()
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#alertas-metas-lista li")) == 1)
    driver.find_element(By.XPATH, "//tr[td[contains(., 'Complemento 80')]]//button[contains(@class,'lixo')]").click()
    driver.switch_to.alert.accept()
    wait.until(lambda d: not d.find_element(By.CSS_SELECTOR, "#alertas-metas").is_displayed())
    el("#bt-metas").click()
    data("#meta-mes", anterior.strftime("%Y-%m"))
    Select(el("#meta-categoria")).select_by_visible_text("Lazer")
    digitar("#meta-limite", "10,00")
    el("#meta-salvar").click()
    aguardar("Meta criada", "#meta-aviso")
    data("#metas-filtro-mes", hoje.strftime("%Y-%m"))
    el("#bt-inicio").click()
    registrar("despesa", "8,00", anterior.isoformat(), "Despesa retroativa", "Lazer")
    aguardar("Meta de Lazer", "#impacto-meta")
    aguardar("80%", "#impacto-meta")
    assert not el("#alertas-metas").is_displayed()
    data("#referencia", anterior.isoformat())
    wait.until(lambda d: len(d.find_elements(By.XPATH, "//tr[td[contains(., 'Despesa retroativa')]]//button[contains(@class,'lixo')]")) == 1)
    driver.find_element(By.XPATH, "//tr[td[contains(., 'Despesa retroativa')]]//button[contains(@class,'lixo')]").click()
    driver.switch_to.alert.accept()
    aguardar("Meta de Lazer", "#impacto-meta")
    aguardar("0%", "#impacto-meta")
    data("#referencia", hoje.isoformat())
    aguardar("74,50", "#c-saldo")
    aguardar("-25,50", "#c-resultado")
    registrar("receita", "50,00", futuro, "Receita futura", "Renda")
    aguardar("74,50", "#c-saldo")
    data("#referencia", futuro)
    aguardar("50,00", "#c-resultado")
    Select(el("#periodicidade")).select_by_value("dia")
    aguardar("50,00", "#c-resultado")
    Select(el("#periodicidade")).select_by_value("semana")
    aguardar("50,00", "#c-resultado")
    Select(el("#periodicidade")).select_by_value("ano")
    aguardar("50,00", "#c-resultado")
    Select(el("#periodicidade")).select_by_value("mes")
    data("#referencia", hoje.isoformat())
    aguardar("-25,50", "#c-resultado")
    Select(el("#filtro-tipo")).select_by_value("DESPESA")
    wait.until(lambda d: len(d.find_element(By.CSS_SELECTOR, "#filtro-categoria").find_elements(By.TAG_NAME, "option")) == 2)
    assert [o.text for o in el("#filtro-categoria").find_elements(By.TAG_NAME, "option")] == ["Todas as categorias", "Lazer"]
    Select(el("#filtro-categoria")).select_by_visible_text("Lazer")
    Select(el("#filtro-tipo")).select_by_value("RECEITA")
    aguardar("filtro foi limpo", "#filtro-aviso")
    assert el("#filtro-categoria").get_attribute("value") == ""
    driver.save_screenshot("/tmp/balancesys-dashboard.png")
    el("#bt-metas").click()
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, "#area-metas").is_displayed())
    aguardar("Gasto R$ 25,50 · 25,5% utilizado. Restam R$ 74,50.", "#metas-lista")
    assert el("#metas-lista progress").get_attribute("value") == "25.5"
    el("#bt-inicio").click()
    assert not el("#alertas-metas").is_displayed()
    Select(el("#filtro-tipo")).select_by_value("DESPESA")
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#lista .lixo")) == 1)
    el("#lista .editar").click()
    digitar("#f-valor", "110,00")
    el("#bt-salvar").click()
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#alertas-metas-lista li")) == 2)
    aguardar("atingiu 80%", "#alertas-metas-lista")
    aguardar("atingiu 100%", "#alertas-metas-lista")
    assert "Lazer" in el("#alertas-metas-lista").text
    driver.save_screenshot("/tmp/balancesys-alerts.png")
    driver.refresh()
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#alertas-metas-lista li")) == 2)
    Select(el("#filtro-tipo")).select_by_value("DESPESA")
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#lista .editar")) == 1)
    el("#lista .editar").click()
    digitar("#f-valor", "20,50")
    el("#bt-salvar").click()
    aguardar("Transação atualizada", "#aviso")
    aguardar("79,50", "#c-saldo")
    wait.until(lambda d: not d.find_element(By.CSS_SELECTOR, "#alertas-metas").is_displayed())
    el("#bt-metas").click()
    aguardar("Gasto R$ 20,50 · 20,5% utilizado. Restam R$ 79,50.", "#metas-lista")
    el("#metas-lista .acao-linha").click()
    digitar("#meta-limite", "20,50")
    el("#meta-salvar").click()
    aguardar("Limite alcançado.", "#metas-lista")
    assert len(driver.find_elements(By.CSS_SELECTOR, "#metas-lista .alertas-linha li")) == 2
    el("#metas-lista .acao-linha").click()
    digitar("#meta-limite", "15,00")
    el("#meta-salvar").click()
    aguardar("Excedeu R$ 5,50.", "#metas-lista")
    el("#bt-inicio").click()
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#lista .lixo")) == 1)
    el("#lista .lixo").click()
    driver.switch_to.alert.accept()
    aguardar("100,00", "#c-saldo")
    aguardar("0,00", "#c-resultado")
    el("#bt-metas").click()
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, "#area-metas").is_displayed())
    aguardar("Gasto R$ 0,00 · 0% utilizado. Restam R$ 15,00.", "#metas-lista")
    el("#metas-lista .acao-linha").click()
    digitar("#meta-limite", "150,50")
    el("#meta-salvar").click()
    aguardar("Meta atualizada", "#meta-aviso")
    aguardar("150,50", "#metas-lista")
    el("#metas-lista .excluir").click()
    driver.switch_to.alert.accept()
    aguardar("Meta excluída", "#meta-aviso")
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#metas-lista tr")) == 0)
    data("#meta-mes", hoje.strftime("%Y-%m"))
    Select(el("#meta-categoria")).select_by_visible_text("Lazer")
    digitar("#meta-limite", "120,25")
    el("#meta-salvar").click()
    aguardar("Meta criada", "#meta-aviso")
    data("#metas-filtro-mes", futuro[:7])
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#metas-lista tr")) == 0)
    data("#metas-filtro-mes", hoje.strftime("%Y-%m"))
    aguardar("120,25", "#metas-lista")
    el("#bt-inicio").click()
    driver.execute_script("""const original = window.fetch; window.fetch = (...args) => {
      if (String(args[0]).startsWith('/api/resumo')) { window.fetch = original; return Promise.reject(new Error('falha simulada de atualização')); }
      return original(...args);
    };""")
    registrar("despesa", "10,00", futuro, "Teste atualização parcial", "Lazer")
    aguardar("Alguns dados da tela não foram atualizados", "#aviso")
    quantidade = driver.execute_async_script("""const done = arguments[1]; fetch('/api/transacoes?periodicidade=mes&referencia=' + arguments[0])
      .then(r => r.json()).then(rows => done(rows.filter(r => r.descricao === 'Teste atualização parcial').length));""", futuro)
    assert quantidade == 1
    el("#bt-sair").click()
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, "#area-auth").is_displayed())
    assert not el("#area-app").is_displayed()
    cadastrar(email_b, senha_b)
    verificar(email_b)
    entrar(email_b, senha_b)
    aguardar("0,00", "#c-saldo")
    assert len(el("#filtro-categoria").find_elements(By.TAG_NAME, "option")) == 1
    el("#bt-metas").click()
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, "#area-metas").is_displayed())
    assert len(driver.find_elements(By.CSS_SELECTOR, "#metas-lista tr")) == 0
    el("#bt-sair").click()
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, "#area-auth").is_displayed())
    el("#auth-recuperar").click()
    digitar("#auth-email", email_b)
    el("#auth-enviar").click()
    aguardar("Se o endereço estiver apto", "#auth-mensagem")
    driver.get(ultimo_link(email_b, "recuperar"))
    aguardar("Definir nova senha", "#auth-titulo")
    digitar("#auth-senha", senha_nova)
    digitar("#auth-confirmar", senha_nova)
    el("#auth-enviar").click()
    aguardar("Senha alterada", "#auth-mensagem")
    entrar(email_b, senha_nova)
    print("Firefox: cadastro/validação/mostrar senha/confirmar, verificação local, login, lançamentos, saldo, metas, alertas 80%/100% sem duplicação, isolamento e recuperação passaram")
finally:
    driver.quit()
