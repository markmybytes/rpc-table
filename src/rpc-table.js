class RpcTable {

    /**
    * Retrieves the headers of the table.
    * @returns {Array<string>} An array containing the innerText of each th element in the first row of the table.
    */
    get tableHeaders() {
        return [...this.#table.querySelectorAll("tr:nth-child(1) th")].map((node) => node.innerText);
    }

    /** @type {HTMLTableElement} */
    #table;

    /** @type {Array<HTMLTableRowElement>} */
    #children;

    /** @type {Object<string, number>} */
    #breakpoints;

    /** @type {number} */
    #resizeTimeout;

    /** @type {null | number} */
    #resizeTimer;

    /**
     * @param {string} selector CSS selector
     * @param {{breakpoints: Object<string, number>, resizeTimeout: number, renderOnResize: boolean}} options 
     */
    constructor(selector, options = {}) {
        this.#table = document.querySelector(selector);
        if (!this.#table) {
            throw new Error("Invalid selector")
        }
        this.#table.classList.add("rpc");

        this.#children = [];
        this.#breakpoints = options.breakpoints || {
            "collapse-xs": 576,
            "collapse-sm": 768,
            "collapse-md": 992,
            "collapse-lg": 1200,
            "collapse": Number.MAX_SAFE_INTEGER,
        }
        this.#resizeTimer = null;
        this.#resizeTimeout = parseInt(options.resizeTimeout) || 150;

        this.process();

        this.#table.addEventListener("click", (event) => {
            if (!event.target.classList.contains("rpc-toggler"))
                return;

            let tr = event.target.closest("tr");
            if (tr.classList.contains("rpc-expanded")) {
                tr.nextSibling.remove();
            } else {
                tr.after(this.#children[tr.dataset.childIndex]);
            }

            tr.classList.toggle("rpc-expanded");
        })
        
        if (!options.hasOwnProperty("renderOnResize") ||
            (options.hasOwnProperty("renderOnResize") && options.renderOnResize)
        ) {
            window.addEventListener("resize", this.#handleResize.bind(this));
        }
    }

    /** 
     * Processes the table to create child rows.
     * 
     * Creates child rows for each row in the table body that does not have the "child" class.
     * Assigns a unique index to each child row.
     * Renders the updated table.
     */
    process() {
        this.#children = [];

        this.#table.querySelectorAll("tbody tr:not(.child)").forEach((tr) => {
            let child = Object.assign(document.createElement("tr"), {
                classList: ["child"],
                colspan: "100%",
                innerHTML: `<td colspan=\"100%\"><ul data-row=\"${tr.rowIndex}\"></ul></td>`,
            });


            tr.querySelectorAll("td").forEach((td, i) => {
                if (!td.classList.contains("rpc-hidden"))
                    return
                child.querySelector("td > ul").appendChild(this.#createChildLi(td))
            });

            tr.dataset.childIndex = this.#children.length;
            tr.dataset.row = tr.rowIndex;

            this.#children.push(child);
        })
        this.render();
    }

    /**
     * Renders the table with updated child rows and responsive classes.
     * 
     * Toggles the responsive class based on the visibility of child rows.
     * Updates the child rows based on the visibility of cells in each row.
     * Removes child rows that are no longer needed.
     * Updates the toggler class for rows with child rows.
     */
    render() {
        this.#toggleResponsiveClass();

        this.#table.querySelectorAll("tbody tr:not(.child)").forEach((tr) => {
            let child = this.#children[tr.dataset.childIndex];
            /** @type {HTMLUListElement} */
            let childContainer = child.querySelector("tr > td > ul");

            for (let td of tr.cells) {
                if (td.classList.contains("rpc-hidden")
                    && !this.#inChild(child, tr.dataset.row, td.cellIndex)
                ) {
                    // create child
                    let index = childContainer.children.length;
                    while (true) {
                        if (index == 0) {
                            childContainer.prepend(this.#createChildLi(td));
                            break;
                        }

                        index--;
                        if (td.cellIndex > childContainer.children[index].dataset.column) {
                            childContainer.children[index].after(this.#createChildLi(td));
                            break;
                        }
                    }
                    continue;
                }

                if (!td.classList.contains("rpc-hidden")
                    && this.#inChild(child, tr.dataset.row, td.cellIndex)
                ) {
                    // remove child
                    for (let li of childContainer.getElementsByTagName("li")) {
                        if (li.dataset.column != td.cellIndex) {
                            continue;
                        }

                        for (let row of this.#table.rows) {
                            if (row.dataset.row != tr.dataset.row)
                                continue;

                            let span = li.querySelector(".rpc-child-value");
                            if (span.children.length > 0) {
                                this.#table.rows[row.rowIndex].cells[parseInt(li.dataset.column)].append(...span.children);
                            } else {
                                this.#table.rows[row.rowIndex].cells[parseInt(li.dataset.column)].innerHTML = span.innerHTML;
                            }
                            li.remove();
                            break;
                        }
                        break;
                    }
                    continue;
                }
            }

            tr.querySelector('td.rpc-toggler')?.classList.remove("rpc-toggler");
            if (childContainer.children.length > 0) {
                tr.classList.add("has-child")
                tr.querySelector('td:not(.rpc-hidden)').classList.add("rpc-toggler");
            } else {
                tr.classList.remove("has-child")
                if (tr.classList.contains("rpc-expanded")) {
                    this.#table.rows[tr.rowIndex + 1].remove()
                    tr.classList.remove("rpc-expanded")
                }
            }
        });
    }

    /**
     * Retrieves the hidden classes based on the current window width and breakpoints.
     * @returns {Array<string>} An array of class names that are hidden based on the current window width.
     */
    hiddenClasses() {
        return Object.keys(this.#breakpoints)
            .filter((k) => this.#breakpoints[k] >= window.innerWidth)
    }

    /**
     * Toggles the responsive class for table headers and cells based on the current window width and breakpoints.
     */
    #toggleResponsiveClass() {
        this.#table.querySelectorAll("thead > tr > th").forEach((th, i) => {
            let responsive = [...th.classList].filter(c => Object.keys(this.#breakpoints).includes)[0]

            this.#table.querySelectorAll(`tbody tr:not(.child) td:nth-child(${i + 1})`).forEach((td) => {
                if (responsive)
                    td.classList.add(responsive)

                if (responsive && this.hiddenClasses().includes(responsive)) {
                    th.classList.add("rpc-hidden")
                    td.classList.add("rpc-hidden")
                } else {
                    th.classList.remove("rpc-hidden")
                    td.classList.remove("rpc-hidden")
                }
            });
        });
    }

    /**
     * Checks if a cell is present in a child row.
     * 
     * @param {HTMLElement} child - The child element.
     * @param {number} row - The row value of the cell.
     * @param {number} column - The column value of the cell.
     * @returns {boolean} True if the cell is present in the child row, false otherwise.
     */
    #inChild(child, row, column) {
        let ul = child.querySelector("ul");
        for (let li of ul.getElementsByTagName("li")) {
            if (ul.dataset.row == row && li.dataset.column == column) {
                return true
            }
        }
        return false
    }

    /**
     * Creates a child list item element for a given table cell.
     * 
     * @param {HTMLTableCellElement} td - The table cell element.
     * @returns {HTMLLIElement} The created list item element.
     */
    #createChildLi(td) {
        let li = document.createElement("li");
        li.dataset.column = td.cellIndex;

        li.appendChild(Object.assign(document.createElement("span"), {
            classList: ["rpc-child-title"],
            innerHTML: this.tableHeaders[td.cellIndex],
        }));

        li.appendChild(Object.assign(document.createElement("span"), {
            classList: ["rpc-child-value"],
        }));

        if (td.children.length > 0) {
            li.children[1].append(...td.children)
        } else {
            li.children[1].innerHTML = td.innerText
        }

        return li
    }

    /**
     * Handle screen resize.
     * 
     * @param {UIEvent} event 
     */
    #handleResize(event) {
        if (this.#resizeTimeout <= 0) {
            this.render.bind(this);
        } else {
            clearTimeout(this.#resizeTimer);
            this.#resizeTimer = setTimeout(this.render.bind(this), this.#resizeTimeout);
        }
    }
}