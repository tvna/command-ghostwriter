#! /usr/bin/env python
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, Optional

from features.command_render import GhostwriterRender
from features.config_parser import GhostwriterParser


class GhostwriterCore:
    def __init__(self: "GhostwriterCore", config_error_header: Optional[str] = None, template_error_header: Optional[str] = None) -> None:
        self.__config_dict: Optional[Dict[str, Any]] = None
        self.__config_str: Optional[str] = None
        self.__render: Optional[GhostwriterRender] = None
        self.__formatted_text: Optional[str] = None
        self.__config_error_message: Optional[str] = None
        self.__template_error_message: Optional[str] = None

        self.__config_error_header = config_error_header
        self.__template_error_header = template_error_header

    def set_config_dict(self: "GhostwriterCore", config: Optional[Dict[str, Any]]) -> None:
        """Set config dict for template args."""

        self.__config_dict = config

    def load_config_file(self: "GhostwriterCore", config_file: Optional[BytesIO]) -> "GhostwriterCore":
        """Load config file for template args."""

        # 呼び出しされるたびに、前回の結果をリセットする
        self.__config_dict = None
        self.__config_str = None

        if not (config_file and hasattr(config_file, "name")):
            return self

        parser = GhostwriterParser()
        parser.load_config_file(config_file).parse()

        if isinstance(parser.error_message, str):
            error_header = self.__config_error_header
            self.__config_error_message = f"{error_header}: {parser.error_message} in '{config_file.name}'"
            return self

        self.__config_dict = parser.parsed_dict
        self.__config_str = parser.parsed_str

        return self

    def load_template_file(
        self: "GhostwriterCore", template_file: Optional[BytesIO], is_strict_undefined: bool, is_clear_dup_lines: bool
    ) -> "GhostwriterCore":
        """Load jinja template file."""

        self.__formatted_text = None

        if not template_file:
            return self

        render = GhostwriterRender(is_strict_undefined, is_clear_dup_lines)
        if not render.load_template_file(template_file).validate_template():
            error_header = self.__template_error_header
            self.__template_error_message = f"{error_header}: {render.error_message} in '{template_file.name}'"

        self.__template_filename = template_file.name
        self.__render = render

        return self

    def apply_context(self: "GhostwriterCore") -> "GhostwriterCore":
        """Apply context-dict for loaded template."""

        if self.__config_dict is None or self.__render is None:
            return self

        render = self.__render

        if not render.apply_context(self.__config_dict):
            error_header = self.__template_error_header
            self.__template_error_message = f"{error_header}: {render.error_message} in '{self.__template_filename}'"
            return self

        self.__formatted_text = render.render_content
        return self

    def get_download_filename(
        self: "GhostwriterCore", filename: Optional[str], file_ext: Optional[str], is_append_timestamp: bool
    ) -> Optional[str]:
        """Get filename for download contents."""

        if filename is None or file_ext is None:
            return None

        suffix = f"_{datetime.today().strftime(r'%Y-%m-%d_%H%M%S')}" if is_append_timestamp else ""
        filename = f"{filename}{suffix}.{str(file_ext)}"

        return filename

    def get_uploaded_filename(self: "GhostwriterCore", file: Optional[BytesIO]) -> Optional[str]:
        """Get filename for uploaded contents."""

        return file.name if isinstance(file, BytesIO) else None

    @property
    def config_dict(self: "GhostwriterCore") -> Optional[Dict[str, Any]]:
        return self.__config_dict

    @property
    def config_str(self: "GhostwriterCore") -> Optional[str]:
        return self.__config_str

    @property
    def formatted_text(self: "GhostwriterCore") -> Optional[str]:
        return self.__formatted_text

    @property
    def config_error_message(self: "GhostwriterCore") -> Optional[str]:
        return self.__config_error_message

    @property
    def template_error_message(self: "GhostwriterCore") -> Optional[str]:
        return self.__template_error_message

    @property
    def is_ready_formatted(self: "GhostwriterCore") -> bool:
        if self.__formatted_text is None:
            return False
        return True
