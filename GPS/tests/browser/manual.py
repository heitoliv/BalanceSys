"""Fluxo de conta fictícia, somente em banco balancesys_test_* e API manual."""
import os
import uuid
from urllib.parse import urlparse
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.ui import WebDriverWait

url = os.environ.get("TEST_DATABASE_URL", "")
if os.environ.get("BALANCESYS_BROWSER_TEST") != "1" or not urlparse(url).path.lstrip("/").startswith("balancesys_test_"):
    raise SystemExit("Use apenas banco isolado balancesys_test_* e BALANCESYS_BROWSER_TEST=1.")

opcoes = Options()
opcoes.add_argument("-headless")
opcoes.binary_location = "/run/current-system/sw/bin/firefox"
driver = webdriver.Firefox(service=Service(), options=opcoes)
driver.set_window_size(1280, 900)
esperar = WebDriverWait(driver, 12)
nick_a = f"_alice{uuid.uuid4().hex[:8]}"
nick_b = f"2bob{uuid.uuid4().hex[:8]}"

def campo(css):
    return driver.find_element(By.CSS_SELECTOR, css)

def digitar(css, texto):
    elemento = campo(css)
    elemento.clear()
    elemento.send_keys(texto)

def conter(css, texto):
    esperar.until(lambda d: texto in d.find_element(By.CSS_SELECTOR, css).text)

try:
    driver.get(os.environ.get("BALANCESYS_BROWSER_URL", "http://localhost:3000/"))
    esperar.until(lambda d: d.find_element(By.CSS_SELECTOR, "#auth-alternar").is_displayed())
    assert "Nome de usuário" in campo("#campo-nickname").text
    assert campo("#auth-recuperar").is_displayed()

    def cadastrar(nickname):
        campo("#auth-alternar").click()
        digitar("#auth-nome", "Pessoa de teste")
        digitar("#auth-nickname", nickname)
        digitar("#auth-senha", "SenhaTeste1!")
        digitar("#auth-confirmar", "SenhaTeste1!")
        campo("#auth-enviar").click()
        conter("#auth-mensagem", "Conta criada")
        codigo = campo("#auth-codigo-gerado").text
        assert len(codigo) == 64
        campo("#auth-codigo-ok").click()
        assert not campo("#area-app").is_displayed()
        return codigo

    def entrar(nickname, senha):
        digitar("#auth-nickname", nickname)
        digitar("#auth-senha", senha)
        campo("#auth-enviar").click()
        esperar.until(lambda d: d.find_element(By.CSS_SELECTOR, "#area-app").is_displayed())

    codigo_a = cadastrar(nick_a)
    entrar(nick_a, "SenhaTeste1!")
    campo("#bt-conta").click()
    novo_nick = "novo-" + nick_a
    digitar("#conta-nickname-novo", novo_nick)
    digitar("#conta-nickname-senha", "SenhaTeste1!")
    campo("#conta-nickname-form button[type=submit]").click()
    conter("#conta-nickname", novo_nick)
    nick_a = novo_nick
    assert campo("#conta-senha-form").is_displayed()
    digitar("#conta-senha-atual", "errada")
    digitar("#conta-senha-nova", "NovaSenha1!")
    digitar("#conta-senha-confirmar", "NovaSenha1!")
    campo("#conta-senha-salvar").click()
    conter("#conta-senha-erro-atual", "incorreta")
    digitar("#conta-senha-atual", "SenhaTeste1!")
    campo("#conta-senha-salvar").click()
    conter("#auth-mensagem", "Senha alterada")
    assert not campo("#area-app").is_displayed()
    digitar("#auth-nickname", nick_a)
    digitar("#auth-senha", "SenhaTeste1!")
    campo("#auth-enviar").click()
    conter("#auth-mensagem", "incorretos")
    entrar(nick_a, "NovaSenha1!")
    campo("#bt-conta").click()
    assert not driver.find_elements(By.CSS_SELECTOR, "#conta-senha-regras li.ok")
    driver.save_screenshot("/tmp/balancesys-conta-manual.png")
    campo("#bt-sair").click()
    esperar.until(lambda d: d.find_element(By.CSS_SELECTOR, "#area-auth").is_displayed())
    codigo_b = cadastrar(nick_b)
    entrar(nick_b, "SenhaTeste1!")
    campo("#bt-conta").click()
    conter("#conta-nickname", nick_b)
    assert nick_a not in campo("#area-conta").text
    campo("#bt-sair").click()
    esperar.until(lambda d: d.find_element(By.CSS_SELECTOR, "#area-auth").is_displayed())
    campo("#auth-recuperar").click()
    digitar("#auth-nickname", nick_b)
    digitar("#auth-codigo", codigo_b)
    digitar("#auth-senha", "Recupera1!")
    digitar("#auth-confirmar", "Recupera1!")
    campo("#auth-enviar").click()
    conter("#auth-mensagem", "Senha alterada")
    assert len(campo("#auth-codigo-gerado").text) == 64
    assert campo("#auth-codigo-gerado").text != codigo_b
    campo("#auth-codigo-ok").click()
    entrar(nick_b, "Recupera1!")
    print("Firefox: cadastro, nickname, senha, recuperação por código, sessão e isolamento passaram")
finally:
    driver.quit()
